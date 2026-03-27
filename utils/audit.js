const AuditLog = require('../model/auditLog');

/**
 * Logs an action to the audit trail.
 * @param {Object} req - The express request object (must contain user and schoolId)
 * @param {String} action - The action performed (CREATE, UPDATE, DELETE, etc.)
 * @param {String} entity - The entity affected (Student, Result, etc.)
 * @param {String|Object} entityId - The ID of the entity affected
 * @param {Object} details - Additional details about the change
 */
exports.logAudit = async (req, action, entity, entityId, details = {}) => {
    try {
        if (!req.user || !req.schoolId) {
            console.warn('Audit log skipped: Missing user or schoolId context.');
            return;
        }

        await AuditLog.create({
            action,
            entity,
            entityId,
            user: req.user._id,
            schoolId: req.schoolId,
            details,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Do not throw error to avoid breaking the main flow
    }
};
