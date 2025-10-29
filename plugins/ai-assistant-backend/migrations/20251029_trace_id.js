/**
 *
 * @param {import('knex').knex} knex
 */

exports.down = async knex => {
  const hasTraceIdColumn = await knex.schema.hasColumn('message', 'trace_id');
  if (hasTraceIdColumn) {
    await knex.schema.alterTable('message', table => {
      table.dropColumn('trace_id');
    });
  }
};

/**
 *
 * @param {import('knex').knex} knex
 */

exports.up = async knex => {
  const hasTraceIdColumn = await knex.schema.hasColumn('message', 'trace_id');
  if (!hasTraceIdColumn) {
    await knex.schema.alterTable('message', table => {
      table
        .string('trace_id')
        .nullable()
        .comment(
          'Langfuse trace ID for the message, used for scoring and observability',
        );
    });
  }
};
