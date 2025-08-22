export interface Config {
  aiAssistant: {
    storage: {
      pgVector: {
        /**
         * The size of the chunk to flush when storing embeddings to the DB
         */
        chunkSize?: number;

        /**
         * The default amount of embeddings to return when querying vectors with similarity search
         */
        amount?: number;
      };
    };
  };
}
