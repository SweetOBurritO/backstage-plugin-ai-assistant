/**
 *
 * @param {import('knex').knex} knex
 */

exports.down = async knex => {
  // update all messages that have the role human back to role user
  await knex('message').where('role', 'human').update({ role: 'user' });

  // update all messages that have the role ai back to role assistant
  await knex('message').where('role', 'ai').update({ role: 'assistant' });
};

/**
 *
 * @param {import('knex').knex} knex
 */

exports.up = async knex => {
  // update all messages that have the role user to role human
  await knex('message').where('role', 'user').update({ role: 'human' });

  // update all messages that have the role assistant to role ai
  await knex('message').where('role', 'assistant').update({ role: 'ai' });
};
