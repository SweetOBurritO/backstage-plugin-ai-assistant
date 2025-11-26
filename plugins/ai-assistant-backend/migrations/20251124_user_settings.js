const mcpConfigTable = 'user_mcp_config';
const newConfigTable = 'user_ai_assistant_settings';

/**
 *
 * @param {import('knex').knex} knex
 */

exports.down = async knex => {
  // Recreate old table
  await knex.schema.createTable(mcpConfigTable, table => {
    table
      .uuid('id')
      .primary()
      .notNullable()
      .defaultTo(knex.raw('gen_random_uuid()'));
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

  const mcpSettings = await knex(newConfigTable)
    .where('type', 'mcp_server_config')
    .select('*');

  for (const setting of mcpSettings) {
    const servers = setting.data;
    const insertRecords = Object.entries(servers).map(
      ([name, encryptedOptions]) => ({
        userRef: setting.userRef,
        name,
        encryptedOptions,
        created_at: setting.created_at,
        updated_at: setting.updated_at,
      }),
    );

    if (insertRecords.length > 0) {
      await knex.batchInsert(mcpConfigTable, insertRecords);
    }
  }

  await knex.schema.dropTable(newConfigTable);
};

/**
 *
 * @param {import('knex').knex} knex
 */

exports.up = async knex => {
  await knex.schema.createTable(newConfigTable, table => {
    table
      .uuid('id')
      .primary()
      .notNullable()
      .defaultTo(knex.raw('gen_random_uuid()'));

    table.text('userRef').notNullable().comment('Reference to the user');

    table
      .text('type')
      .notNullable()
      .comment('AI Assistant setting type. i.e "MCP, tools etc"');

    table
      .jsonb('data')
      .notNullable()
      .comment('AI assistant settings for the user');

    table.unique(['userRef', 'type']);
    table.timestamps(true, true);
  });

  // Check if old table exists
  const hasMcpConfigTable = await knex.schema.hasTable(mcpConfigTable);

  if (!hasMcpConfigTable) {
    return;
  }

  const mcpConfigs = await knex(mcpConfigTable).select('*');

  if (mcpConfigs.length <= 0) {
    await knex.schema.dropTable(mcpConfigTable);
    return;
  }

  const configsByUser = mcpConfigs.reduce((acc, config) => {
    if (!acc[config.userRef]) {
      acc[config.userRef] = {
        userRef: config.userRef,
        servers: {},
        created_at: config.created_at,
        updated_at: config.updated_at,
      };
    }
    // Use name as key, encryptedOptions as value
    acc[config.userRef].servers[config.name] = config.encryptedOptions;

    // Keep the most recent timestamps
    if (config.updated_at > acc[config.userRef].updated_at) {
      acc[config.userRef].updated_at = config.updated_at;
    }

    return acc;
  }, {});

  await knex.batchInsert(
    newConfigTable,
    Object.values(configsByUser).map(userConfig => ({
      userRef: userConfig.userRef,
      type: 'mcp_server_config',
      data: userConfig.servers,
      created_at: userConfig.created_at,
      updated_at: userConfig.updated_at,
    })),
  );

  await knex.schema.dropTable(mcpConfigTable);
};
