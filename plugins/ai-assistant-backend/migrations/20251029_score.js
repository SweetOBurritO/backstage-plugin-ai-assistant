/**
 *
 * @param {import('knex').knex} knex
 */

exports.down = async knex => {
  const hasScoreColumn = await knex.schema.hasColumn('message', 'score');
  if (hasScoreColumn) {
    await knex.schema.alterTable('message', table => {
      table.dropColumn('score');
    });
  }
};

/**
 *
 * @param {import('knex').knex} knex
 */

exports.up = async knex => {
  const hasScoreColumn = await knex.schema.hasColumn('message', 'score');
  if (!hasScoreColumn) {
    await knex.schema.alterTable('message', table => {
      table
        .float('score')
        .nullable()
        .defaultTo(0)
        .comment(
          'User feedback score for the message: 0 = no feedback, 1 = helpful, -1 = not helpful',
        );
    });
  }
};
