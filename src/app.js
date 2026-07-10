const express = require('express'),
  controller = require('../controller'),
  admin = require('../controller/admin/admin'),
  path = require('path'),
  bodyParser = require('body-parser'),
  mongoose = require('mongoose'),
  passport = require('passport'),
  config = require('../config'),
  student = require('../controller/student'),
  cookieSession = require('cookie-session');

const { isAuth, verifyUser, getToken } = require("../authentication");
const { subjectCombination, createSubjectCombination, manageSubjectsCombination, updateSubjectCombination,
  deleteSubjectCombination, getSubjectsByClass
} = require("../controller/admin/subject-combination");
const { getResults, generateClassResultsPage, getResultUploadTemplate, generateClassAnnualResultsPage } = require("../controller/admin/results");

const app = express();
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const port = process.env.PORT || 3030;
const dbUrl = process.env.MONGODB_URI;

// Global process-level error handlers to preven  t crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Note: In production, consider restarting the process. Here we log to avoid crashing.
});

// Helper to wrap async route handlers and forward errors to Express
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve().then(() => fn(req, res, next)).catch(next);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(require("express-pdf"));
app.use('/public', express.static(`${__dirname}/../public`));
app.set('view engine', 'ejs');
app.use(
  cookieSession({
    name: config.session_name,
    keys: [config.session_secret],
    // saveUninitialized: false,
    // resave: false,
  })
);
//-------------DataBase------------------------------------------

// mongoose.set('strictQuery', false)
mongoose.connect(dbUrl, {
  useNewUrlParser: true
});

const db = mongoose.connection;
db.once('connected', () => {
  console.log('conected successfully to database');
  app.listen(port, () => console.log(`Example app listening on ${port} port!`));
})
  .on('error', err => {
    console.log(err);
  })
  .once('disconnected', () => {
    console.log('database disconnected');
  });

//-------------------------------Route----------------------------
//Home page
app.get('/', controller.home);

app.use(passport.initialize());
app.use(passport.session());

// Student Login
app.get('/student/login', student.login);
app.post('/student/result', asyncHandler(student.getAnnualResult));
app.post('/student/annual-result', asyncHandler(student.getAnnualResult));
app.get('/student/annual-result', asyncHandler(student.getAnnualResult));

//admin
app.get('/admin/dashboard', isAuth, verifyUser, admin.doAfterLogin);
app.post('/admin/dashboard',
  passport.authenticate("local", { session: false, failureRedirect: "/" }),
  (req, res, next) => {
    // console.log(req.user)
    const token = getToken({ _id: req.user._id })
    req.session = { token }
    res.redirect("/admin/dashboard")
  });
app.post('/crateadmin', admin.createAdmin);

//admin logout
app.get('/logout', admin.logout);

//subject
app.get('/admin/subject', isAuth, verifyUser, admin.subject);
app.post('/admin/subject', isAuth, verifyUser, admin.createSubject);
app.get('/admin/manage-subject', isAuth, verifyUser, admin.manageSubjects);
app.put('/admin/manage-subject/:id', admin.updateSubject);
app.delete('/admin/manage-subject/:id', isAuth, verifyUser, admin.deleteSubject);

app.get('/admin/subject-combination', isAuth, verifyUser, asyncHandler(subjectCombination));
app.post('/admin/subject-combination', isAuth, verifyUser, asyncHandler(createSubjectCombination));
app.get('/admin/manage-subject-combination', isAuth, verifyUser, asyncHandler(manageSubjectsCombination));
app.put('/admin/manage-subject-combination/:id', asyncHandler(updateSubjectCombination));
app.delete('/admin/manage-subject-combination/:id', isAuth, verifyUser, asyncHandler(deleteSubjectCombination));

//class
app.get('/admin/create-class', isAuth, verifyUser, admin.classCreate);
app.post('/admin/create-class', isAuth, verifyUser, admin.doClassCreate);
app.get('/admin/manage-classes', isAuth, verifyUser, admin.manageClasses);
app.delete(
  '/admin/manage-classes/:id',
  isAuth, verifyUser,
  admin.deleteClass
);

//student
app.get('/admin/add-student', isAuth, verifyUser, admin.studentAdmission);
app.post(
  '/admin/add-student',
  isAuth, verifyUser,
  admin.dostudentAdmission
);
app.get('/admin/manage-student', isAuth, verifyUser, admin.manageStudent);
app.delete(
  '/admin/manage-student/:id',
  isAuth, verifyUser,
  admin.deleteStudent
);
app.put('/admin/manage-student/:id', admin.updateStudent);

//staff
app.get('/admin/manage-staff', isAuth, verifyUser, admin.manageStaff);
app.put('/admin/manage-staff/:id', isAuth, verifyUser, admin.updateStaff);
app.delete('/admin/manage-staff/:id', isAuth, verifyUser, admin.deleteStaff);

//school (super-admin only)
app.get('/admin/manage-schools', isAuth, verifyUser, admin.manageSchools);
app.post('/admin/schools', isAuth, verifyUser, admin.createSchool);
app.put('/admin/schools/:id', isAuth, verifyUser, admin.updateSchool);
app.delete('/admin/schools/:id', isAuth, verifyUser, admin.deleteSchool);

app.delete(
  '/admin/manage-classes/:id',
  isAuth, verifyUser,
  admin.deleteClass
);

//template testing 
app.get('/test', asyncHandler(student.renderingSampleTemplate));

//Result
app.get('/admin/add-result', isAuth, verifyUser, admin.result);
app.post('/admin/add-result', isAuth, verifyUser, admin.addResult);
app.get('/admin/manage-result', admin.manageResult);
app.delete('/admin/manage-result/:id', admin.deleteResult);
app.put('/admin/manage-result/:id', admin.updateReSult);

//ApI
app.get('/classes', admin.getClass);
app.get('/students', admin.getStudent);
app.get('/students/:sclass', admin.getStudent);
app.get('/admin/subject-combination/:id', asyncHandler(getSubjectsByClass));
app.get('/admin/results', asyncHandler(getResults));
app.get('/admin/results/template/:classId', asyncHandler(getResultUploadTemplate));
app.get('/admin/students/template/:classId', asyncHandler(admin.getStudentUploadTemplate));
app.get('/admin/class-results', asyncHandler(generateClassAnnualResultsPage));
// app.get('/admin/class-annual-results', asyncHandler(generateClassAnnualResultsPage));




// 404 handler - keep last before error handler
app.use((req, res, next) => {
  res.status(404);
  const format = req.accepts('html', 'json');
  if (format === 'html') {
    return res.render('errors/404', { url: req.url, originalUrl: req.originalUrl });
  }
  if (format === 'json') {
    return res.json({ error: 'Not Found' });
  }
  return res.type('txt').send('Not Found');
});

// Centralized error handler - must be the last middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  try {
    console.error('Error handler caught:', err && (err.stack || err));
  } catch (_) { }

  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  const format = req.accepts('html', 'json');
  if (format === 'html') {
    const stack = process.env.NODE_ENV === 'production' ? null : (err && err.stack) || null;
    return res.status(status).render('errors/error', { status, message, stack });
  }
  if (format === 'json') {
    return res.status(status).json({ error: message });
  }
  return res.status(status).type('txt').send(message);
});
