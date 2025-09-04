const TABLE_NAME = 'conversation';

/**
 *
 * @param {import('knex').knex} knex
 */
exports.down = async knex => {
  await knex.schema.dropTable(TABLE_NAME);
};

/**
 *
 * @param {import('knex').knex} knex
 */
exports.up = async knex => {
  await knex.schema.createTable(TABLE_NAME, table => {
    table.comment(
      'Stores chat history for conversations with the AI assistant.',
    );
    table
      .uuid('id')
      .notNullable()
      .primary()
      .comment('UUID of the chat message');
    table
      .text('conversation_id')
      .notNullable()
      .comment('Identifier for the conversation this message belongs to');
    table
      .text('role')
      .notNullable()
      .comment("Role of the message sender, e.g., 'user' or 'assistant'");
    table.text('content').notNullable().comment('Content of the chat message');
    table
      .text('userRef')
      .notNullable()
      .comment('Reference to the user who sent the message');
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp when the message was created');
  });
};
