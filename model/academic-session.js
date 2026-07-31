const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const academicSessionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

const AcademicSession = mongoose.model('academic-sessions', academicSessionSchema);
module.exports = AcademicSession;
