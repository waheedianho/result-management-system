  // const Model = require('../../model/schema');
// const { ClassModel } = Model;
  const ClassModel = require('../../model/school-class');

classCreate = (req, res) => {
  res.render('admin/create-class');
};

doClassCreate = (req, res, next) => {
  console.log(req.body);
  const data = { ...req.body, schoolId: req.user.schoolId };
  ClassModel.create(data)
    .then(async resp => {
      await logAudit(req, 'CREATE', 'Class', resp._id, { cname: resp.cname });
      res.json({
        type: 'sucess',
        message: `${resp.cname} class added sucessfully`,
      });
    })
    .catch(err => {
      res.json({ type: 'danger', message: err.message });
    });
};

manageClasses = (req, res, next) => {
  ClassModel.find({ schoolId: req.user.schoolId })
    .then(docs => {
      res.render('admin/manage-class', {
        docs,
        url: req.url,
      });
    })
    .catch(err => {
      next(err);
    });
};

deleteClass = (req, res) => {
  console.log(req.params.id);
  ClassModel.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId })
    .then(async resp => {
      if (resp) await logAudit(req, 'DELETE', 'Class', resp._id, { cname: resp.cname });
      res.json(resp);
    })
    .catch(err => res.json(err));
};

getClass = (req, res) => {
  ClassModel.find({ schoolId: req.user.schoolId }).then(docs => {
    res.json(docs);
  });
};

module.exports = {
  classCreate,
  manageClasses,
  doClassCreate,
  deleteClass,
  getClass,
};
