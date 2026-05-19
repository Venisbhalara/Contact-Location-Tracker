const sequelize = require('../config/db');
const User           = require('./User');

const TrackingRequest = require('./TrackingRequest');
const AccessRequest   = require('./AccessRequest');
const ActivityLog     = require('./ActivityLog');
const Payment         = require('./Payment');
const Group           = require('./Group');
const GroupMember     = require('./GroupMember');
const Otp             = require('./Otp');

// ── Existing associations ─────────────────────────────────────────────────────
User.hasMany(TrackingRequest, { foreignKey: 'userId', as: 'trackingRequests', onDelete: 'CASCADE' });
TrackingRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(AccessRequest, { foreignKey: 'userId', as: 'accessRequests', onDelete: 'CASCADE' });
AccessRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ActivityLog, { foreignKey: 'userId', as: 'activityLogs', onDelete: 'CASCADE' });
ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Payment, { foreignKey: 'userId', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ── Group associations ────────────────────────────────────────────────────────
User.hasMany(Group, { foreignKey: 'userId', as: 'groups', onDelete: 'CASCADE' });
Group.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

Group.hasMany(GroupMember, { foreignKey: 'groupId', as: 'members', onDelete: 'CASCADE' });
GroupMember.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });

GroupMember.belongsTo(TrackingRequest, { foreignKey: 'trackingRequestId', as: 'trackingRequest' });
TrackingRequest.hasOne(GroupMember, { foreignKey: 'trackingRequestId', as: 'groupMember' });

module.exports = { sequelize, User, TrackingRequest, AccessRequest, ActivityLog, Payment, Group, GroupMember, Otp };
