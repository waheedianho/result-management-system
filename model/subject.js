const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//Subject Schema
const subjectSchema = new Schema(
    {
        sname: {
            type: String,
            required: true,
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

subjectSchema.index({ sname: 1, schoolId: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const Subjects = mongoose.model("subjects", subjectSchema);

module.exports = Subjects;