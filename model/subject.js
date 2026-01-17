const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//Subject Schema
const subjectSchema = new Schema(
    {
        _id: {type: String},
        sname: {
            type: String,
            unique: true,
            required: true,
        },
        scode: {
            type: String,
            unique: true,
            required: false,
        },
        schoolId: {
            type: Schema.Types.ObjectId,
            ref: 'schools',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

subjectSchema.pre('save', function (next) {
    if (this.isNew) {
        this._id = this.sname;
    }
    next();
});


const Subjects = mongoose.model("subjects", subjectSchema);

module.exports = Subjects;