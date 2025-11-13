export interface Config {
  aiAssistant: {
    callbacks: {
      langfuse: {
        baseUrl: string;

        /**
         * @visibility secret
         */
        publicKey: string;

        /**
         * @visibility secret
         */
        secretKey: string;
      };
    };
  };
}
