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

export type PgVectorStoreOptions = {
  database: DatabaseService;
  logger: LoggerService;
  config: RootConfigService;
};

export class PgVectorStore implements VectorStore {
  private readonly tableName: string = 'embeddings';
  private embeddings?: Embeddings;

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

  connectEmbeddings(embeddings: Embeddings) {
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
    const texts = documents.map(({ content }) => content);
    if (!this.embeddings) {
      throw new Error('No Embeddings configured for the vector store.');
    }

    const vectors = await this.embeddings.embedDocuments(texts);
    this.logger.info(
      `Received ${vectors.length} vectors from embeddings creation.`,
    );
    this.addVectors(vectors, documents);
  }

  /**
   * Adds vectors to the database along with corresponding documents.
   *
   * @param {number[][]} vectors - The vectors to be added.
   * @param {EmbeddingDoc[]} documents - The corresponding documents.
   * @return {Promise<void>} - A promise that resolves when the vectors are added successfully.
   * @throws {Error} - If there is an error inserting the vectors.
   */
  private async addVectors(
    vectors: number[][],
    documents: EmbeddingDocument[],
  ): Promise<void> {
    try {
      const rows = [];
      for (let i = 0; i < vectors.length; i += 1) {
        const embedding = vectors[i];
        const embeddingString = `[${embedding.join(',')}]`;
        const values = {
          content: documents[i].content.replace(/\0/g, ''),
          vector: embeddingString.replace(/\0/g, ''),
          metadata: documents[i].metadata,
        };
        rows.push(values);
      }

      await this.client.batchInsert(this.tableName, rows, this.chunkSize);
    } catch (e) {
      this.logger.error((e as Error).message);
      throw new Error(`Error inserting: ${(e as Error).message}`);
    }
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
      SELECT *, vector <=> :embeddingString as "_distance"
      FROM ${this.tableName}
      WHERE metadata::jsonb @> :filter
      ORDER BY "_distance" ASC
      LIMIT :amount
    `;

    const documents = (
      await this.client.raw(queryString, {
        embeddingString,
        filter: JSON.stringify(filter ?? {}),
        amount,
      })
    ).rows;

    const results = [] as [EmbeddingDocument, number][];
    for (const doc of documents) {
      // eslint-ignore-next-line
      if (doc._distance !== null && doc.content !== null) {
        const document = {
          content: doc.content,
          metadata: doc.metadata,
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
    filter: EmbeddingDocumentMetadata,
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
