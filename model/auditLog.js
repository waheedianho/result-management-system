const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const auditLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW'],
    },
    entity: {
      type: String, // e.g., 'Student', 'Result', 'Staff'
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'staffs',
      required: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'schools',
      required: true, // Audit logs must be tenant-aware
    },
    details: {
      type: Schema.Types.Mixed, // Flexible field for changed values, diffs, etc.
    },
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

// Index for fast querying by school and date
auditLogSchema.index({ schoolId: 1, createdAt: -1 });

const AuditLog = mongoose.model('audit_logs', auditLogSchema);
module.exports = AuditLog;
