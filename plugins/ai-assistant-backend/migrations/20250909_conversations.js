const oldMessageTable = 'conversation';
const newMessageTable = 'message';
const newConversationTable = 'conversation';

/**
 *
 * @param {import('knex').knex} knex
 */
exports.down = async knex => {
  // Remove link between messages and conversations
  const hasConversationId = await knex.schema.hasColumn(
    newMessageTable,
    'conversation_id',
  );
  if (hasConversationId) {
    await knex.schema.alterTable(newMessageTable, table => {
      table.dropForeign('conversation_id');
      table.dropColumn('conversation_id');
    });
  }

  // Drop new conversations table
  const hasNewConversationTable = await knex.schema.hasTable(
    newConversationTable,
  );
  if (hasNewConversationTable) {
    await knex.schema.dropTable(newConversationTable);
  }

  // Rename message table back to conversation
  const hasMessageTable = await knex.schema.hasTable(newMessageTable);
  if (hasMessageTable) {
    await knex.schema.renameTable(newMessageTable, oldMessageTable);

    // Rename the constraint back to original name
    await knex.raw(
      'ALTER TABLE conversation RENAME CONSTRAINT message_pkey TO conversation_pkey',
    );
  }
};

/**
 *
 * @param {import('knex').knex} knex
 */
exports.up = async knex => {
  // Check if the old conversation table exists and needs to be renamed
  const hasOldConversationTable = await knex.schema.hasTable(oldMessageTable);
  const hasMessageTable = await knex.schema.hasTable(newMessageTable);

  if (hasOldConversationTable && !hasMessageTable) {
    // First, rename the primary key constraint to avoid conflicts
    await knex.raw(
      'ALTER TABLE conversation RENAME CONSTRAINT conversation_pkey TO message_pkey',
    );
    // Rename old table to new name
    await knex.schema.renameTable(oldMessageTable, newMessageTable);
  }

  // Create new conversations table (only if it doesn't exist)
  const hasNewConversationTable = await knex.schema.hasTable(
    newConversationTable,
  );
  if (!hasNewConversationTable) {
    await knex.schema.createTable(newConversationTable, table => {
      table.uuid('id').primary().notNullable();
      table.string('title').notNullable().comment('Title of the conversation');
      table
        .text('userRef')
        .notNullable()
        .comment('Reference to the user who sent the message');
      table.timestamps(true, true);
    });
  }

  // Add conversation_id column to message table (only if it doesn't exist)
  const hasConversationId = await knex.schema.hasColumn(
    newMessageTable,
    'conversation_id',
  );
  if (!hasConversationId) {
    await knex.schema.alterTable(newMessageTable, table => {
      table
        .uuid('conversation_id')
        .notNullable()
        .comment('Identifier for the conversation this message belongs to')
        .references('id')
        .inTable(newConversationTable)
        .onDelete('RESTRICT'); // Prevents deleting conversations with messages
    });
  }
};
