const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schoolSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    address: String,
    phone: String,
    email: {
      type: String,
      unique: true,
      sparse: true,   // allows multiple docs with null/undefined email
    },
    // White-labelling / branding fields
    logoUrl: {
      type: String,
      default: null,
    },
    primaryColor: {
      type: String,
      default: '#6366f1', // indigo
    },
    accentColor: {
      type: String,
      default: '#8b5cf6', // violet
    },
    tagline: {
      type: String,
      default: '',
    },
    currentSession: {
      type: String,
      default: '2025/2026',
    },
    currentTerm: {
      type: String,
      default: 'First',
      enum: ['First', 'Second', 'Third']
    },
  },
  { timestamps: true }
);

// Convert empty-string email to undefined so the sparse unique index works correctly
schoolSchema.pre('save', function (next) {
  if (this.email === '') this.email = undefined;
  next();
});
schoolSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && update.$set && update.$set.email === '') update.$set.email = undefined;
  if (update && update.email === '') update.email = undefined;
  next();
});

const School = mongoose.model('schools', schoolSchema);
module.exports = School;
