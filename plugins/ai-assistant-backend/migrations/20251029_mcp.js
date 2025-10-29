const mcpConfigTable = 'user_mcp_config';

/**
 *
 * @param {import('knex').knex} knex
 */

exports.down = async knex => {
  const hasMcpConfigTable = await knex.schema.hasTable(mcpConfigTable);

  if (hasMcpConfigTable) {
    await knex.schema.dropTable(mcpConfigTable);
  }
};

/**
 *
 * @param {import('knex').knex} knex
 */

exports.up = async knex => {
  await knex.schema.createTable(mcpConfigTable, table => {
    table.uuid('id').primary().notNullable().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .text('userRef')
      .notNullable()
      .comment('Reference to the user who sent the message');
    table
      .text('name')
      .notNullable()
      .comment('Name of the MCP server configuration');
    table
      .text('encryptedOptions')
      .notNullable()
      .comment('Encrypted MCP server configuration');
    table.timestamps(true, true);
  });
};
