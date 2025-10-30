/**
 *
 * @param {import('knex').knex} knex
 */

exports.down = async knex => {
  const hasScoreColumn = await knex.schema.hasColumn('message', 'score');
  const hasTraceIdColumn = await knex.schema.hasColumn('message', 'trace_id');

  if (hasScoreColumn || hasTraceIdColumn) {
    await knex.schema.alterTable('message', table => {
      if (hasScoreColumn) {
        table.dropColumn('score');
      }
      if (hasTraceIdColumn) {
        table.dropColumn('trace_id');
      }
    });
  }
};

/**
 *
 * @param {import('knex').knex} knex
 */

exports.up = async knex => {
  const hasScoreColumn = await knex.schema.hasColumn('message', 'score');
  const hasTraceIdColumn = await knex.schema.hasColumn('message', 'trace_id');

  if (!hasScoreColumn || !hasTraceIdColumn) {
    await knex.schema.alterTable('message', table => {
      if (!hasScoreColumn) {
        table
          .float('score')
          .nullable()
          .defaultTo(0)
          .comment(
            'User feedback score for the message: 0 = no feedback, 1 = helpful, -1 = not helpful',
          );
      }
      if (!hasTraceIdColumn) {
        table
          .string('trace_id')
          .nullable()
          .comment(
            'Langfuse trace ID for the message, used for scoring and observability',
          );
      }
    });
  }
};
