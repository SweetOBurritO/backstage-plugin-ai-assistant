const EMBEDDINGS_TABLE = 'embeddings';

/**
 *
 * @param {import('knex').knex} knex
 */
exports.down = async knex => {
  await knex.schema.alterTable(EMBEDDINGS_TABLE, table => {
    table.dropColumn('hash');
    table.dropColumn('lastUpdated');
  });
};

/**
 *
 * @param {import('knex').knex} knex
 */
exports.up = async knex => {
  await knex.schema.alterTable(EMBEDDINGS_TABLE, table => {
    table.string('hash').comment('The content hash of the embedding document');

    table
      .timestamp('lastUpdated')
      .comment('Timestamp of the last update to the embedding document');
  });
};
