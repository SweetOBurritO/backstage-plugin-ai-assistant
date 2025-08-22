const TABLE_NAME = 'embeddings';

/**
 *
 * @param {import('knex').knex} knex
 */

exports.down = async knex => {
  await knex.schema.dropTable('embeddings');
  await knex.raw('drop extension if exists "uuid-ossp"');
  await knex.raw('drop extension if exists "vector"');
};

/**
 *
 * @param {import('knex').knex} knex
 */

exports.up = async knex => {
  await knex.raw('create extension if not exists "uuid-ossp"');
  await knex.raw('create extension if not exists "vector"');
  await knex.schema.createTable(TABLE_NAME, table => {
    table.comment(
      'Stores embeddings of documents from the system to be used as RAG AI injectables. ',
    );
    table
      .uuid('id')
      .notNullable()
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'))
      .comment('UUID of the embedding');
    table
      .text('content')
      .notNullable()
      .comment('Actual content of the embedding. Chunks of text/data');
    table
      .jsonb('metadata')
      .notNullable()
      .comment(
        'Metadata of the embedding. Information like entityRef etc. that can be used to identify links to other parts of the system.',
      );
  });
  await knex.schema.raw(`ALTER TABLE ${TABLE_NAME}
      ADD vector vector NOT NULL ; `);
  await knex.schema.raw(`COMMENT ON COLUMN ${TABLE_NAME}.vector
     IS 'Vector weights of the related content.';`);
};
