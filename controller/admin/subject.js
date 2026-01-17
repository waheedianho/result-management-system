// const Model = require('../../model/schema');
// const { Subjects } = Model;

const Subjects = require('../../model/subject');

subject = (req, res) => {
  res.render('admin/subject');
};

// subjectCombination = (req, res) => {
//     res.render('admin/add-subject-combination');
// }

createSubject = (req, res, next) => {
  console.log(req.body);
  const data = { ...req.body, schoolId: req.user.schoolId };
  Subjects.create(data)
    .then(resp => {
      res.json({
        type: 'sucess',
        message: `${resp.sname}  added sucessfully`,
      });
    })
    .catch(err => {
      res.json({ type: 'danger', message: err.message });
    });
};

manageSubjects = (req, res) => {
  Subjects.find({ schoolId: req.user.schoolId }).then(docs => {
    res.render('admin/manage-subject', {
      docs,
      url: req.url,
    });
  });
};

updateSubject = (req, res) => {
  Subjects.findOneAndUpdate({ _id: req.params.id, schoolId: req.user.schoolId }, { $set: req.body }, { new: true })
    .then(subject => res.json('success'))
    .catch(err => res.json(err));
};

deleteSubject = (req, res) => {
  console.log(req.params.id);
  Subjects.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId })
    .then(resp => res.json(resp))
    .catch(err => res.json(err));
};

module.exports = {
    subject,
    createSubject,
    manageSubjects,
    deleteSubject,
    updateSubject,
};
