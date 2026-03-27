const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//class Schema
const classSchema = new Schema(
    {
        cname: {
            type: String,
            required: true,
        },
        cnameNum: {
            type: Number,
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

classSchema.index({ cname: 1, schoolId: 1 }, { unique: true });
classSchema.index({ cnameNum: 1, schoolId: 1 }, { unique: true });

const ClassModel = mongoose.model("classes", classSchema);
module.exports = ClassModel;