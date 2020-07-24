'use strict'
module.exports = {
  up: async function (queryInterface, Sequelize) {
    return queryInterface.addColumn('Notes', 'alias', {
      type: Sequelize.STRING
    }).then(function () {
      return queryInterface.addIndex('Notes', ['alias'], {
        indicesType: 'UNIQUE'
      })
    }).catch(function (error) {
      if (error.message === 'SQLITE_ERROR: duplicate column name: alias' || error.message === "ER_DUP_FIELDNAME: Duplicate column name 'alias'" || error.message === 'column "alias" of relation "Notes" already exists') {
        // eslint-disable-next-line no-console
        console.log('Migration has already run… ignoring.')
      } else {
        throw error
      }
    })
  },

  down: async function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Notes', 'alias').then(function () {
      return queryInterface.removeIndex('Notes', ['alias'])
    })
  }
}