const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subjectCombinationSchema = new Schema({
    subject: { type: Schema.Types.ObjectId, ref: 'subjects' },
    class: { type: Schema.Types.ObjectId, ref: 'classes' },
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'schools',
        required: true,
    },
    // teacher: { type: Schema.Types.ObjectId, ref: 'staff' },
});

const SubjectCombination = mongoose.model('subject-combinations', subjectCombinationSchema);
module.exports = SubjectCombination;