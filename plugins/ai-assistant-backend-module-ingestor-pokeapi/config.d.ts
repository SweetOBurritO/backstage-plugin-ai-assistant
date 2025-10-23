export interface Config {
  aiAssistant?: {
    ingestors?: {
      pokeapi?: {
        /**
         * Maximum number of Pokemon to ingest
         * @default 151
         */
        maxPokemon?: number;

        /**
         * Whether to include Pokemon abilities
         * @default true
         */
        includeAbilities?: boolean;

        /**
         * Whether to include Pokemon moves
         * @default true
         */
        includeMoves?: boolean;

        /**
         * Whether to include Pokemon evolution chains
         * @default true
         */
        includeEvolutions?: boolean;
      };
    };
  };
}
