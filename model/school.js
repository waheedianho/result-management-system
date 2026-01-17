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
  },
  { timestamps: true }
);

const School = mongoose.model('schools', schoolSchema);
module.exports = School;
