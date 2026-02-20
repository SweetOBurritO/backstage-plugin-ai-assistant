const TABLE_NAME = 'shared_conversation';
const CONVERSATION_TABLE_NAME = 'conversation';

/**
 *
 * @param {import('knex').knex} knex
 */
exports.down = async knex => {
  const hasTable = await knex.schema.hasTable(TABLE_NAME);

  if (hasTable) {
    await knex.schema.dropTable(TABLE_NAME);
  }
};

/**
 *
 * @param {import('knex').knex} knex
 */
exports.up = async knex => {
  const hasTable = await knex.schema.hasTable(TABLE_NAME);

  if (!hasTable) {
    await knex.schema.createTable(TABLE_NAME, table => {
      table.uuid('id').primary().notNullable();
      table
        .uuid('conversation_id')
        .notNullable()
        .references('id')
        .inTable(CONVERSATION_TABLE_NAME)
        .onDelete('CASCADE');
      table
        .timestamp('created_at')
        .notNullable()
        .defaultTo(knex.fn.now())
        .comment('Timestamp when the share link was created');

      table.index(['conversation_id']);
    });
  }
};
