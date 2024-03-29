'use strict';
const loader = require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const Schedule = loader.database.define(
  'schedules',
  {
    scheduleId: {
      type: Sequelize.UUID,
      primaryKey: true,
      allowNull: false
    },
    scheduleName: {
      type: Sequelize.STRING,
      allowNull: false
    },
    memo: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    createdBy: {
      type: Sequelize.STRING,
      allowNull: false
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false
    },
    day: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    style: {
      type: Sequelize.TEXT(6), // リアルタイムかオンデマンドか
      allowNull: true
    },
    term: {
      type: Sequelize.TEXT(5),
      allowNull: true
    }
  },
  {
    freezeTableName: true,
    timestamps: false,
    indexes: [
      {
        fields: ['createdBy']
      }
    ]
  }
);

module.exports = Schedule;