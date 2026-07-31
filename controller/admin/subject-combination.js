const SubjectCombination = require('../../model/subject-combination');
const Subject = require('../../model/subject');
const Classes = require('../../model/school-class');

subjectCombination = async (req, res) => {
    const subjects = await Subject.find({ schoolId: req.user.schoolId });
    const classes = await Classes.find({ schoolId: req.user.schoolId });

    console.log(subjects)
    console.log(classes)
    res.render('admin/add-subject-combination', {
        subjects,
        classes,
    });
}

getSubjectsByClass = async (req, res) => {
    const subjectComb = await SubjectCombination.find({ class: req.params.id, schoolId: req.user.schoolId }).populate('class').populate('subject');
    console.log(subjectComb)
    return res.json(subjectComb);
}

createSubjectCombination = async (req, res, next) => {
    console.log(req.body);
    try{

        if (!req.body.subjects) {
            throw new Error('Subjects are required');
        }
        const subjects = Array.isArray(req.body.subjects) ? req.body.subjects : [req.body.subjects];
        const subjectCombinations = subjects.map(subject => ({
            class: req.body.class,
            subject,
            schoolId: req.user.schoolId
        }));
        await SubjectCombination.create(subjectCombinations);

        res.json({
            type: 'success',
            message: `subject added successfully`,
        });
    } catch (e) {
        res.json({ type: 'danger', message: e.message });
    }
};

manageSubjectsCombination = async (req, res) => {
    const subjectCombo = await SubjectCombination.find({ schoolId: req.user.schoolId }).populate('class').populate('subject');
    const subjects = await Subject.find({ schoolId: req.user.schoolId });
    const classes = await Classes.find({ schoolId: req.user.schoolId });
    res.render('admin/manage-subject-combination', {
        docs: subjectCombo,
        subjects,
        classes,
        url: req.url,
    });
};

updateSubjectCombination = (req, res) => {
    SubjectCombination.findOneAndUpdate({ _id: req.params.id, schoolId: req.user.schoolId }, { $set: req.body }, { new: true })
        .then(subject => res.json('success'))
        .catch(err => res.json(err));
};

deleteSubjectCombination = (req, res) => {
    console.log(req.params.id);
    SubjectCombination.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId })
        .then(resp => res.json(resp))
        .catch(err => res.json(err));
};

module.exports = {
    subjectCombination,
    createSubjectCombination,
    manageSubjectsCombination,
    deleteSubjectCombination,
    updateSubjectCombination,
    getSubjectsByClass,
}