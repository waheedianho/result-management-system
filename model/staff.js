const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const Schema = mongoose.Schema;

const staffSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    role: {
      type: String,
      enum: ['super-admin', 'admin', 'teacher'],
      default: 'teacher',
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'schools',
      required: false,
    },
    assignedClass: {
      type: Schema.Types.ObjectId,
      ref: 'classes',
    },
  },
  { timestamps: true }
);

// Configure passport-local-mongoose to use 'email' as the username field
staffSchema.plugin(passportLocalMongoose, { usernameField: 'email' });

const Staff = mongoose.model('staffs', staffSchema);
module.exports = Staff;