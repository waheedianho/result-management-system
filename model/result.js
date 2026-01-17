const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const resultSchema = new Schema({
    subject: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'subject-combinations',
    },
    sclass: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'classes',
    },
    exam_score: {
        type: Number,
        required: true,

    },
    ca_score: {
        type: Number,
        required: true,

    },
    grade: {
        type: String,
        // required: true,
    },
    session: {
        type: String,
        required: true,
    },
    term: {
        type: String,
        required: true,
        enum: ['First', 'Second', 'Third']
    },
    isRetake: {
        type: Boolean,
        default: false
    },
    totalScore: {
        type: Number,
        // required: true,
        default: 100
    },
    student: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'students',
    },
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'schools',
        required: true,
    },
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            delete ret.createdAt;
            return ret;
        }
    }
});

resultSchema.pre('save', function (next) {
    this.totalScore = this.exam_score + this.ca_score;
    this.grade = this.calculateGrade(this.totalScore);
    next();
});

resultSchema.pre('findOneAndUpdate', async function (next) {
    const docToUpdate = await this.model.findOne(this.getQuery());
    const update = this.getUpdate();

    const exam_score = update.exam_score || docToUpdate.exam_score;
    const ca_score = update.ca_score || docToUpdate.ca_score;

    const totalScore = Number(exam_score) + Number(ca_score);
    update.totalScore = totalScore;
    update.grade = this.schema.methods.calculateGrade(totalScore);
    next();
});

// resultSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], async function (next) {
//     const docToUpdate = await this.model.findOne(this.getQuery());
//     const update = this.getUpdate();
//
//     const exam_score = update.exam_score || docToUpdate.exam_score;
//     const ca_score = update.ca_score || docToUpdate.ca_score;
//
//     const totalScore = Number(exam_score) + Number(ca_score);
//     update.totalScore = totalScore;
//     update.grade = this.schema.methods.calculateGrade(totalScore);
//     next();
// });

resultSchema.methods.calculateGrade = function (totalScore) {
    if (totalScore >= 70) return 'A';
    if (totalScore >= 60) return 'B';
    if (totalScore >= 50) return 'C';
    if (totalScore >= 45) return 'D';
    if (totalScore >= 40) return 'E';
    return 'F';
};

resultSchema.index(
    { student: 1, subject: 1, session: 1, term: 1 /*, sclass: 1 */ },
    { unique: true, name: 'uniq_student_subject_session_term' }
);

const Result =  mongoose.model("results", resultSchema);
module.exports = Result;