const student = require('../student');
const classes = require('./class');
const subject = require('./subject');
const students = require('./student');
const results = require('./results');
const Staff = require('../../model/staff');
const ClassModel = require("../../model/school-class");
const Subjects = require("../../model/subject");
const Students = require("../../model/student");
const Result = require("../../model/result");
const School = require("../../model/school");
// const { ClassModel, Subjects, Students } = require('../../model/schema');

verifyUser = (req, res) => {
  res.redirect('/admin/dashboard');
};

doAfterLogin = async (req, res) => {
  try {
    const user = req.user;

    if (user.role === 'super-admin') {
      const schools = await School.find({});
      const allStaff = await Staff.find({});
      const allStudents = await Students.find({});
      const allResults = await Result.find({});

      return res.render('admin/admin', {
        user,
        schools,
        StaffReg: allStaff,
        ClassesReg: await ClassModel.find({}),
        SubjectsReg: await Subjects.find({}),
        StudentsReg: allStudents,
        uploadResult: allResults,
      });
    }

    const schoolId = user.schoolId;

    if (!schoolId) {
      return res.status(403).send("User does not belong to any school.");
    }

    const query = { schoolId };
    
    // For teachers, we might want to restrict what they see on the dashboard too
    // but the requirement specifically mentioned class result interference.
    // Let's at least filter everything by schoolId.

    const StaffReg = await Staff.find(query),
      ClassesReg = await ClassModel.find(query),
      SubjectsReg = await Subjects.find(query),
      StudentsReg = await Students.find(query),
      result = await Result.find(query);

    res.render('admin/admin', {
      user,
      StaffReg,
      ClassesReg,
      SubjectsReg,
      StudentsReg,
      uploadResult: result,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

logout = (req, res) => {
  req.user ? req.session.destroy() && res.redirect('/') : res.redirect('/');
};

createAdmin = (req, res, next) => {
  const { email, pswrd, role, schoolId, ...rest } = req.body;
  const staffData = { username: email, email, role, ...rest };
  
  if (req.user && req.user.role !== 'super-admin') {
    staffData.schoolId = req.user.schoolId;
  } else if (schoolId && schoolId !== '') {
    staffData.schoolId = schoolId;
  }

  Staff.register(staffData, pswrd, (err, staff) => {
    if (!err) return res.json(staff);
    else next(err)
  });
};

manageStaff = async (req, res) => {
  try {
    const query = {};
    if (req.user.role !== 'super-admin') {
      query.schoolId = req.user.schoolId;
    }
    const staff = await Staff.find(query).populate(['assignedClass', 'schoolId']);
    const classes = await ClassModel.find(query);
    const schools = req.user.role === 'super-admin' ? await School.find({}) : [];
    res.render('admin/manage-staff', {
      staff,
      classes,
      schools,
      user: req.user,
      url: req.url
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: id };
    if (req.user.role !== 'super-admin') {
      query.schoolId = req.user.schoolId;
    }
    
    const updateData = { ...req.body };
    if (updateData.assignedClass === '') updateData.assignedClass = null;
    if (updateData.schoolId === '') updateData.schoolId = null;

    const updatedStaff = await Staff.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true }
    );
    res.json(updatedStaff);
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json(error);
  }
};

deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot delete yourself." });
    }
    const query = { _id: id };
    if (req.user.role !== 'super-admin') {
      query.schoolId = req.user.schoolId;
    }
    const deletedStaff = await Staff.findOneAndDelete(query);
    res.json(deletedStaff);
  } catch (error) {
    res.status(500).json(error);
  }
};

manageSchools = async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).send("Unauthorized");
    }
    const schools = await School.find({});
    res.render('admin/manage-schools', {
      schools,
      user: req.user,
      url: req.url
    });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

createSchool = async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).send("Unauthorized");
    }
    const school = await School.create(req.body);
    res.json(school);
  } catch (error) {
    res.status(500).json(error);
  }
};

updateSchool = async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).send("Unauthorized");
    }
    const school = await School.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(school);
  } catch (error) {
    res.status(500).json(error);
  }
};

deleteSchool = async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).send("Unauthorized");
    }
    const school = await School.findByIdAndDelete(req.params.id);
    res.json(school);
  } catch (error) {
    res.status(500).json(error);
  }
};

schoolSettings = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).send("Unauthorized");
    }
    const school = await School.findById(req.user.schoolId);
    const AcademicSession = require('../../model/academic-session');
    const sessions = await AcademicSession.find().sort({ createdAt: -1 });
    res.render("admin/school-settings", { user: req.user, school, sessions, currentPath: '/admin/school-settings' });
  } catch (error) {
    res.status(500).json(error);
  }
};

updateSchoolSettings = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).send("Unauthorized");
    }
    const { currentSession, currentTerm } = req.body;
    await School.findByIdAndUpdate(req.user.schoolId, { currentSession, currentTerm });
    
    // Invalidate the branding cache so the new session is immediately reflected
    const { invalidateBrandingCache } = require('../../src/branding');
    invalidateBrandingCache(req.user.schoolId);
    
    res.json({ message: "Updated successfully" });
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports = {
  doAfterLogin,
  logout,
  verifyUser,
  createAdmin,
  manageStaff,
  updateStaff,
  deleteStaff,
  manageSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  schoolSettings,
  updateSchoolSettings,
  subject: subject.subject,
  createSubject: subject.createSubject,
  deleteSubject: subject.deleteSubject,
  updateSubject: subject.updateSubject,
  classCreate: classes.classCreate,
  doClassCreate: classes.doClassCreate,
  deleteClass: classes.deleteClass,
  studentAdmission: students.studentAdmission,
  dostudentAdmission: students.dostudentAdmission,
  manageClasses: classes.manageClasses,
  manageSubjects: subject.manageSubjects,
  manageStudent: students.manageStudent,
  deleteStudent: students.deleteStudent,
  updateStudent: students.updateStudent,
  result: results.result,
  addResult: results.addResult,
  manageResult: results.manageResult,
  deleteResult: results.deleteResult,
  updateReSult: results.updateReSult,
  getClass: classes.getClass,
  getStudent: students.getStudents,
  getStudentUploadTemplate: students.getStudentUploadTemplate,
  getResultUploadTemplate: results.getResultUploadTemplate,
};
