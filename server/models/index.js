const sequelize = require('../config/db');
const User           = require('./User');

const TrackingRequest = require('./TrackingRequest');
const AccessRequest   = require('./AccessRequest');
const ActivityLog     = require('./ActivityLog');

User.hasMany(TrackingRequest, { foreignKey: 'userId', as: 'trackingRequests', onDelete: 'CASCADE' });
TrackingRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(AccessRequest, { foreignKey: 'userId', as: 'accessRequests', onDelete: 'CASCADE' });
AccessRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ActivityLog, { foreignKey: 'userId', as: 'activityLogs', onDelete: 'CASCADE' });
ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { sequelize, User, TrackingRequest, AccessRequest, ActivityLog };
