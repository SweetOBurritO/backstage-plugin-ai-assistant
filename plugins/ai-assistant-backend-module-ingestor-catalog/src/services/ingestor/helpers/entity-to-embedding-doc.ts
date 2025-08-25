import { Entity } from '@backstage/catalog-model';
import { EmbeddingDocument } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { MODULE_ID } from '../../../constants/module';

export function mapEntityToEmbeddingDoc(entity: Entity): EmbeddingDocument {
  const ns = entity.metadata.namespace || 'default';
  const id = `${entity.kind.toLowerCase()}:${ns}/${entity.metadata.name}`;

  // Build content string (natural language summary)
  const parts: string[] = [];

  // Title & description
  if (entity.metadata.title) {
    parts.push(
      `${entity.kind} "${entity.metadata.title}" (${entity.metadata.name})`,
    );
  } else {
    parts.push(`${entity.kind} "${entity.metadata.name}"`);
  }

  if (entity.metadata.description) {
    parts.push(`Description: ${entity.metadata.description}.`);
  }

  // Spec (flatten key fields if present)
  if (entity.spec) {
    for (const [key, value] of Object.entries(entity.spec)) {
      if (typeof value === 'string') {
        parts.push(`${key}: ${value}`);
      } else if (Array.isArray(value)) {
        parts.push(`${key}: ${value.join(', ')}`);
      } else if (typeof value === 'object' && value !== null) {
        for (const [k, v] of Object.entries(value)) {
          if (typeof v === 'string') {
            parts.push(`${k}: ${v}`);
          }
        }
      }
    }
  }

  // Relations (express in plain text)
  if (entity.relations?.length) {
    const relationText = entity.relations
      .map(r => `${r.type} → ${r.targetRef}`)
      .join('; ');
    parts.push(`Relations: ${relationText}`);
  }

  return {
    metadata: {
      source: MODULE_ID,
      id,
      kind: entity.kind,
      namespace: ns,
      name: entity.metadata.name,
      uid: entity.metadata.uid,
    },
    content: parts.join('\n'),
  };
}
