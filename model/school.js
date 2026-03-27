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
    reportCardConfig: {
      logoUrl: { type: String, default: '/public/images/logo.png' },
      themeColor: { type: String, default: '#000000' },
      showAttendance: { type: Boolean, default: true },
      showConduct: { type: Boolean, default: true },
      schoolName: { type: String }, // Override name on report card
      address: { type: String },    // Override address
      phone: { type: String },      // Override phone
      email: { type: String },      // Override email
      website: { type: String },
    },
    gradingScale: {
      type: [{
        min: Number,
        max: Number,
        grade: String,
        remark: String
      }],
      default: [
        { min: 70, max: 100, grade: 'A', remark: 'Excellent' },
        { min: 60, max: 69, grade: 'B', remark: 'Very Good' },
        { min: 50, max: 59, grade: 'C', remark: 'Good' },
        { min: 45, max: 49, grade: 'D', remark: 'Pass' },
        { min: 40, max: 44, grade: 'E', remark: 'Pass' },
        { min: 0, max: 39, grade: 'F', remark: 'Fail' }
      ]
    }
  },
  { timestamps: true }
);

const School = mongoose.model('schools', schoolSchema);
module.exports = School;
