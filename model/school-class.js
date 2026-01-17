const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//class Schema
const classSchema = new Schema(
    {
        cname: {
            type: String,
            unique: true,
            required: true,
        },
        cnameNum: {
            type: Number,
            unique: true,
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

const ClassModel = mongoose.model("classes", classSchema);
module.exports = ClassModel;