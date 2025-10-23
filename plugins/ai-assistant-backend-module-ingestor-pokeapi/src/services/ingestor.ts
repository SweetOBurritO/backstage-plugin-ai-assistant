import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import {
  EmbeddingDocument,
  Ingestor,
  IngestorOptions,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';

const MODULE_ID = 'pokeapi';
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';

interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  types: Array<{ type: { name: string } }>;
  abilities: Array<{ ability: { name: string; url: string } }>;
  moves: Array<{ move: { name: string } }>;
  stats: Array<{ base_stat: number; stat: { name: string } }>;
  species: { url: string };
}

interface PokemonSpecies {
  evolution_chain: { url: string };
  flavor_text_entries: Array<{
    flavor_text: string;
    language: { name: string };
  }>;
  genera: Array<{ genus: string; language: { name: string } }>;
}

interface EvolutionChain {
  chain: {
    species: { name: string };
    evolves_to: Array<{
      species: { name: string };
      evolves_to: Array<{
        species: { name: string };
      }>;
    }>;
  };
}

interface Ability {
  name: string;
  effect_entries: Array<{ effect: string; language: { name: string } }>;
}

export const createPokeAPIIngestor = async ({
  config,
  logger,
}: {
  config: RootConfigService;
  logger: LoggerService;
}): Promise<Ingestor> => {
  // Get configuration values
  const maxPokemon =
    config.getOptionalNumber('aiAssistant.ingestors.pokeapi.maxPokemon') ?? 151;
  const includeAbilities =
    config.getOptionalBoolean(
      'aiAssistant.ingestors.pokeapi.includeAbilities',
    ) ?? true;
  const includeMoves =
    config.getOptionalBoolean('aiAssistant.ingestors.pokeapi.includeMoves') ??
    true;
  const includeEvolutions =
    config.getOptionalBoolean(
      'aiAssistant.ingestors.pokeapi.includeEvolutions',
    ) ?? true;

  // Helper function to fetch from PokeAPI
  const fetchFromAPI = async <T>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch from ${url}: ${response.statusText}`);
    }
    return response.json();
  };

  // Helper function to get English text from multi-language entries
  const getEnglishText = (
    entries: Array<{
      flavor_text?: string;
      effect?: string;
      language: { name: string };
    }>,
  ): string => {
    const english = entries.find(e => e.language.name === 'en');
    return (
      english?.flavor_text?.replace(/\n|\f/g, ' ') || english?.effect || ''
    );
  };

  const ingest = async ({
    saveDocumentsBatch,
  }: IngestorOptions): Promise<void> => {
    logger.info(`Starting PokeAPI ingestion for ${maxPokemon} Pokemon`);

    const documents: EmbeddingDocument[] = [];

    // Fetch Pokemon data
    for (let i = 1; i <= maxPokemon; i++) {
      try {
        logger.info(`Fetching Pokemon ${i}/${maxPokemon}`);

        // Fetch main Pokemon data
        const pokemon = await fetchFromAPI<Pokemon>(
          `${POKEAPI_BASE_URL}/pokemon/${i}`,
        );

        // Fetch species data for descriptions and evolution
        const species = await fetchFromAPI<PokemonSpecies>(pokemon.species.url);

        // Build Pokemon description
        const description = getEnglishText(species.flavor_text_entries);
        const genus =
          species.genera.find(g => g.language.name === 'en')?.genus || '';

        // Build base content
        let content = `# ${
          pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)
        } (${genus})\n\n`;
        content += `**National Dex #${pokemon.id}**\n\n`;
        content += `${description}\n\n`;

        // Add type information
        const types = pokemon.types.map(t => t.type.name).join(', ');
        content += `**Type:** ${types}\n\n`;

        // Add stats
        content += `**Stats:**\n`;
        for (const stat of pokemon.stats) {
          content += `- ${stat.stat.name}: ${stat.base_stat}\n`;
        }
        content += `\n**Height:** ${pokemon.height / 10}m\n`;
        content += `**Weight:** ${pokemon.weight / 10}kg\n`;
        content += `**Base Experience:** ${pokemon.base_experience}\n\n`;

        // Add abilities if enabled
        if (includeAbilities && pokemon.abilities.length > 0) {
          content += `**Abilities:**\n`;
          for (const abilityData of pokemon.abilities) {
            try {
              const ability = await fetchFromAPI<Ability>(
                abilityData.ability.url,
              );
              const effect = getEnglishText(ability.effect_entries);
              content += `- ${ability.name}: ${effect}\n`;
            } catch (error) {
              logger.warn(
                `Failed to fetch ability ${abilityData.ability.name}: ${error}`,
              );
            }
          }
          content += '\n';
        }

        // Add moves if enabled (limit to first 20 to avoid too much data)
        if (includeMoves && pokemon.moves.length > 0) {
          const movesList = pokemon.moves
            .slice(0, 20)
            .map(m => m.move.name)
            .join(', ');
          content += `**Notable Moves:** ${movesList}\n\n`;
        }

        // Add evolution chain if enabled
        if (includeEvolutions) {
          try {
            const evolutionChain = await fetchFromAPI<EvolutionChain>(
              species.evolution_chain.url,
            );
            const evolutions = extractEvolutionChain(evolutionChain.chain);
            if (evolutions.length > 1) {
              content += `**Evolution Chain:** ${evolutions.join(' → ')}\n\n`;
            }
          } catch (error) {
            logger.warn(
              `Failed to fetch evolution chain for ${pokemon.name}: ${error}`,
            );
          }
        }

        // Create embedding document
        documents.push({
          content,
          metadata: {
            source: MODULE_ID,
            id: `pokemon:${pokemon.id}`,
            name: pokemon.name,
            pokedexNumber: pokemon.id.toString(),
            type: types,
            genus,
          },
        });

        // Save in batches of 10 to avoid memory issues
        if (documents.length >= 10) {
          logger.info(`Saving batch of ${documents.length} Pokemon documents`);
          await saveDocumentsBatch([...documents]);
          documents.length = 0; // Clear the array
        }
      } catch (error) {
        logger.error(`Failed to fetch Pokemon ${i}: ${error}`);
      }
    }

    // Save any remaining documents
    if (documents.length > 0) {
      logger.info(
        `Saving final batch of ${documents.length} Pokemon documents`,
      );
      await saveDocumentsBatch(documents);
    }

    logger.info(`PokeAPI ingestion completed successfully`);
  };

  // Helper function to extract evolution chain
  const extractEvolutionChain = (chain: EvolutionChain['chain']): string[] => {
    const result: string[] = [chain.species.name];

    if (chain.evolves_to.length > 0) {
      for (const evolution of chain.evolves_to) {
        result.push(evolution.species.name);
        if (evolution.evolves_to.length > 0) {
          for (const finalEvolution of evolution.evolves_to) {
            result.push(finalEvolution.species.name);
          }
        }
      }
    }

    return result;
  };

  return {
    id: MODULE_ID,
    ingest,
  };
};
