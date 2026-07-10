const mongoose = require("mongoose");
const Schema = mongoose.Schema;


//Student Schema
const studentSchema = new Schema(
    {
        fname: {
            type: String,
            required: true,
        },
        rollId: {
            type: String,
            required: true,
        },
        email: {
            type: String,
        },
        gender: {
            type: String,
            required: true,
        },
        sclass: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "classes",
        },
        dob: {
            type: Date,
            required: true,
        },
        phone_no: {
            type: String,
        },
        address: {
            type: String,
        },
        schoolId: {
            type: Schema.Types.ObjectId,
            ref: 'schools',
            required: true,
        },
        photoUrl: {
            type: String,
        },
        result: [{ type: Schema.Types.ObjectId, ref: "results" }],
    },
    {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                delete ret.createdAt;
                return ret;
            }
        }
    }
);

studentSchema.index({ rollId: 1, schoolId: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const Students = mongoose.model("students", studentSchema);
module.exports = Students;
