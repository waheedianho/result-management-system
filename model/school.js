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

const School = mongoose.model('schools', schoolSchema);
module.exports = School;
