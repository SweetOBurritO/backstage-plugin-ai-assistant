# AI Assistant Backend Module - PokeAPI Ingestor

This module provides a data ingestor that fetches Pokemon data from the [PokeAPI](https://pokeapi.co/) and makes it available for the AI Assistant to answer questions about Pokemon.

## Features

- Ingests Pokemon data including:
  - Basic information (name, type, height, weight, stats)
  - Descriptions and classifications
  - Abilities with detailed effects
  - Move sets
  - Evolution chains
- Configurable ingestion scope
- Batch processing for efficient data handling

## Installation

1. Install the package:

```bash
# From the root of your Backstage project
yarn workspace backend add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-pokeapi
```

2. Add the module to your backend in `packages/backend/src/index.ts`:

```typescript
// Add this import
import { aiAssistantModuleIngestorPokeapi } from '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-pokeapi';

// Add to backend.add() calls
backend.add(aiAssistantModuleIngestorPokeapi());
```

## Configuration

Add configuration to your `app-config.yaml`:

```yaml
aiAssistant:
  ingestors:
    pokeapi:
      # Maximum number of Pokemon to ingest (default: 151)
      # Set to 1025 to get all Pokemon as of Gen 9
      maxPokemon: 151

      # Whether to include detailed ability information (default: true)
      includeAbilities: true

      # Whether to include move sets (default: true)
      includeMoves: true

      # Whether to include evolution chains (default: true)
      includeEvolutions: true
```

### Configuration Options

| Option              | Type    | Default | Description                                                                    |
| ------------------- | ------- | ------- | ------------------------------------------------------------------------------ |
| `maxPokemon`        | number  | 151     | Maximum number of Pokemon to ingest. Set to 151 for Gen 1, 251 for Gen 2, etc. |
| `includeAbilities`  | boolean | true    | Include detailed ability descriptions and effects                              |
| `includeMoves`      | boolean | true    | Include notable moves each Pokemon can learn                                   |
| `includeEvolutions` | boolean | true    | Include evolution chain information                                            |

## Usage

Once configured, the ingestor will run when you trigger data ingestion in the AI Assistant. The Pokemon data will be embedded and stored in the vector database, making it queryable by the AI.

### Example Questions

After ingestion, you can ask the AI Assistant questions like:

- "What are Pikachu's abilities?"
- "Tell me about Charizard's stats"
- "What type is Bulbasaur?"
- "Show me the evolution chain for Eevee"
- "What moves can Mewtwo learn?"

## Data Structure

Each Pokemon is stored as a separate document with the following metadata:

```typescript
{
  source: 'pokeapi',
  id: 'pokemon:25',  // Format: pokemon:{pokedex_number}
  name: 'pikachu',
  pokedexNumber: '25',
  type: 'electric',
  genus: 'Mouse Pokémon'
}
```

## Performance Considerations

- The ingestor fetches data in batches of 10 Pokemon at a time
- Each Pokemon requires multiple API calls (base data, species, abilities, evolutions)
- Ingesting all 1025 Pokemon can take 20-30 minutes depending on your connection
- Consider starting with a smaller `maxPokemon` value for testing

## API Rate Limiting

PokeAPI has no official rate limits, but the ingestor includes reasonable delays between requests to be respectful of the service. If you experience issues, consider:

- Reducing `maxPokemon` value
- Disabling `includeAbilities` to reduce API calls
- Running ingestion during off-peak hours

## Troubleshooting

### Ingestion Fails for Certain Pokemon

Some Pokemon data may be incomplete or unavailable. The ingestor will log warnings and continue with the next Pokemon.

### Slow Ingestion

The PokeAPI doesn't require authentication but has no caching. Each ingestion fetches fresh data. Consider:

- Reducing the number of features enabled
- Running ingestion less frequently
- Using a smaller `maxPokemon` value

### Memory Issues

If you're ingesting a large number of Pokemon (>500), the ingestor batches documents to avoid memory issues. If problems persist, reduce `maxPokemon`.

## Development

To modify or extend this ingestor:

```bash
# Navigate to the module directory
cd plugins/ai-assistant-backend-module-ingestor-pokeapi

# Install dependencies
yarn install

# Build
yarn build

# Run tests
yarn test
```

## License

Apache-2.0
