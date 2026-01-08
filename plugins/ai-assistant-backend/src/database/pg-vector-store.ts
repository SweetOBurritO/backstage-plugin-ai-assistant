import {
  DatabaseService,
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import {
  VectorStore,
  EmbeddingDocument,
  EmbeddingDocumentMetadata,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { Embeddings } from '@langchain/core/embeddings';
import { Knex } from 'knex';
import { createHash } from 'crypto';
import { v4 as uuid } from 'uuid';

export type PgVectorStoreOptions = {
  database: DatabaseService;
  logger: LoggerService;
  config: RootConfigService;
};

export class PgVectorStore implements VectorStore {
  private readonly tableName: string = 'embeddings';
  private embeddings?: Omit<Embeddings, 'caller'>;

  // Recency bias configuration
  private readonly RECENCY_WEIGHT = 0.3; // Weight for document recency (0-1)
  private readonly SIMILARITY_WEIGHT = 1 - this.RECENCY_WEIGHT; // Weight for vector similarity (0-1)
  private readonly RECENCY_HALF_LIFE_DAYS = 180; // Days until recency boost is halved (6 months)
  private readonly AGE_SCALE_FACTOR = 86400; // Seconds in a day for timestamp conversion

  /**
   * Creates an instance of PgVectorStore.
   * @param client - The Knex client to interact with the PostgreSQL database.
   * @param [amount=4] - The number of embeddings to store.
   * @param [chunkSize=500] - The size of each chunk of embeddings.
   */
  constructor(
    private readonly client: Knex,
    private readonly logger: LoggerService,
    private readonly amount: number = 4,
    private readonly chunkSize: number = 500,
  ) {}

  static async fromConfig({ config, database, logger }: PgVectorStoreOptions) {
    const client = await database.getClient();
    const chunkSize = config.getOptionalNumber(
      'aiAssistant.storage.pgVector.chunkSize',
    );
    const amount = config.getOptionalNumber(
      'aiAssistant.storage.pgVector.amount',
    );

    return new PgVectorStore(client, logger, amount, chunkSize);
  }

  connectEmbeddings(embeddings: Omit<Embeddings, 'caller'>) {
    if (this.embeddings) {
      this.logger.warn('Embeddings already connected, overwriting.');
    }
    this.embeddings = embeddings;
  }

  table() {
    return this.client(this.tableName);
  }

  /**
   * Add documents to the vector store.
   *
   * @param {EmbeddingDocument[]} documents - The array of documents to be added.
   * @throws {Error} When no embeddings are configured for the vector store.
   * @returns {Promise<void>} Resolves when the documents have been added successfully.
   */
  async addDocuments(documents: EmbeddingDocument[]): Promise<void> {
    if (documents.length === 0) {
      return;
    }

    if (!this.embeddings) {
      throw new Error('No Embeddings configured for the vector store.');
    }

    // Fetch existing documents with matching (id, source) pairs
    const conditions = documents
      .map(() => `(metadata->>'id' = ? AND metadata->>'source' = ?)`)
      .join(' OR ');

    const params = documents.flatMap(doc => [
      doc.metadata.id,
      doc.metadata.source,
    ]);

    const existingDocuments: EmbeddingDocument[] = await this.client
      .select('*')
      .from(this.tableName)
      .whereRaw(conditions, params);

    // Build a map for quick lookups
    const existingMap = new Map(
      existingDocuments.map(doc => [
        `${doc.metadata.id}:${doc.metadata.source}`,
        doc,
      ]),
    );

    // Categorize documents
    const newDocuments: EmbeddingDocument[] = [];
    const documentsToUpdate: Array<EmbeddingDocument & { id: string }> = [];

    for (const doc of documents) {
      const key = `${doc.metadata.id}:${doc.metadata.source}`;
      const existing = existingMap.get(key);

      if (!existing) {
        newDocuments.push(doc);
        continue;
      }

      // Check if content changed
      const newHash = createHash('sha256').update(doc.content).digest('hex');
      if (!existing.hash || newHash !== existing.hash) {
        documentsToUpdate.push({ ...doc, id: existing.id! });
      }
    }

    const allDocumentsToAdd = [...newDocuments, ...documentsToUpdate];

    if (allDocumentsToAdd.length === 0) {
      this.logger.debug('No new or updated documents to add.');
      return;
    }

    // Delete old versions before re-adding
    if (documentsToUpdate.length > 0) {
      await this.deleteById(documentsToUpdate.map(doc => doc.id));
    }

    const rows = await Promise.all(
      allDocumentsToAdd.map(async doc => {
        const [vector] = await this.embeddings!.embedDocuments([doc.content]);
        const hash = createHash('sha256').update(doc.content).digest('hex');

        return {
          hash,
          id: doc.id ?? uuid(),
          metadata: doc.metadata,
          lastUpdated: new Date(),
          content: doc.content.replace(/\0/g, ''),
          vector: `[${vector.join(',')}]`,
        };
      }),
    );

    this.logger.info(
      `Adding ${rows.length} documents (${newDocuments.length} new, ${documentsToUpdate.length} updated).`,
    );

    await this.client.batchInsert(this.tableName, rows, this.chunkSize);
  }

  /**
   * Deletes records from the database table by their ids.
   *
   * @param {string[]} ids - The array of ids of the records to be deleted.
   * @returns {Promise<void>} - A promise that resolves when the deletion is complete.
   */
  private async deleteById(ids: string[]) {
    await this.table().delete().whereIn('id', ids);
  }

  /**
   * Deletes rows from the table based on the specified filter.
   *
   * @param {EmbeddingDocMetadata} filter - The filter to apply for deletion.
   * @returns {Promise} - A Promise that resolves when the deletion is complete.
   */
  private async deleteByFilter(filter: EmbeddingDocumentMetadata) {
    const queryString = `
      DELETE FROM ${this.tableName}
      WHERE metadata::jsonb @> :filter
    `;
    return this.client.raw(queryString, { filter });
  }

  /**
   * Deletes documents based on the provided deletion parameters.
   * Either `ids` or `filter` must be specified.
   *
   * @param {Object} deletionParams - The deletion parameters.
   * @param {Array<string>} [deletionParams.ids] - The document IDs to delete.
   * @param {EmbeddingDocMetadata} [deletionParams.filter] - The filter to match documents to be deleted.
   *
   * @return {Promise<void>} - A Promise that resolves once the documents have been deleted.
   */
  async deleteDocuments(deletionParams: {
    ids?: string[];
    filter?: EmbeddingDocumentMetadata;
  }): Promise<void> {
    const { ids, filter } = deletionParams;

    if (!(ids || filter)) {
      throw new Error(
        'You must specify either ids or a filter when deleting documents.',
      );
    }

    if (ids && filter) {
      throw new Error(
        'You cannot specify both ids and a filter when deleting documents.',
      );
    }

    if (ids) {
      await this.deleteById(ids);
    } else if (filter) {
      await this.deleteByFilter(filter);
    }
  }

  /**
   * Finds the most similar documents to a given query vector, along with their similarity scores.
   * Results are ranked by a weighted combination of vector similarity and document recency.
   * i.e newer documents are favored in the ranking but if no new documents exist, older but more similar documents will still be returned.
   *
   * @param {number[]} query - The query vector to compare against.
   * @param {number} amount - The maximum number of results to return.
   * @param {EmbeddingDocumentMetadata} [filter] - Optional filter to limit the search results.
   * @returns {Promise<[EmbeddingDocument, number][]>} - An array of document similarity results, where each
   * result is a tuple containing the document and its similarity score.
   */
  private async similaritySearchVectorWithScore(
    query: number[],
    amount: number,
    filter?: EmbeddingDocumentMetadata,
  ): Promise<[EmbeddingDocument, number][]> {
    const embeddingString = `[${query.join(',')}]`;

    const queryString = `
      SELECT
        *,
        (vector <=> :embeddingString) as "_distance",
        (EXTRACT(EPOCH FROM (NOW() - "lastUpdated")) / :ageScaleFactor) as "_age_days",
        (
          ((vector <=> :embeddingString) * :similarityWeight) +
          (EXP(-0.693 * (EXTRACT(EPOCH FROM (NOW() - "lastUpdated")) / :ageScaleFactor) / :recencyHalfLife) * :recencyWeight)
        ) as "_combined_score"
      FROM ${this.tableName}
      WHERE metadata::jsonb @> :filter
      ORDER BY "_combined_score" ASC
      LIMIT :amount
    `;

    const documents = (
      await this.client.raw(queryString, {
        embeddingString,
        filter: JSON.stringify(filter ?? {}),
        amount,
        similarityWeight: this.SIMILARITY_WEIGHT,
        recencyWeight: this.RECENCY_WEIGHT,
        recencyHalfLife: this.RECENCY_HALF_LIFE_DAYS,
        ageScaleFactor: this.AGE_SCALE_FACTOR,
      })
    ).rows;

    const results = [] as [EmbeddingDocument, number][];
    for (const doc of documents) {
      // eslint-ignore-next-line
      if (doc._distance !== null && doc.content !== null) {
        const document: EmbeddingDocument = {
          content: doc.content,
          metadata: {
            ...doc.metadata,
            ageInDays: Math.round(doc._age_days),
            lastUpdated: doc.lastUpdated,
          },
        };
        results.push([document, doc._distance]);
      }
    }
    return results;
  }

  /**
   * Performs a similarity search using the given query and filter.
   *
   * @param {string} query - The query to perform the similarity search on.
   * @param {EmbeddingDocMetadata} filter - The filter to apply to the search results.
   * @param {number} [amount=4] - The number of results to return.
   * @return {Promise<EmbeddingDoc[]>} - A promise that resolves to an array of RoadieEmbeddingDoc objects representing the search results.
   * @throws {Error} - Throws an error if there are no embeddings configured for the vector store.
   */
  async similaritySearch(
    query: string,
    filter?: EmbeddingDocumentMetadata,
    amount: number = this.amount,
  ): Promise<EmbeddingDocument[]> {
    if (!this.embeddings) {
      throw new Error('No Embeddings configured for the vector store.');
    }
    const results = await this.similaritySearchVectorWithScore(
      await this.embeddings.embedQuery(query),
      amount,
      filter,
    );

    return results.map(result => result[0]);
  }
}
