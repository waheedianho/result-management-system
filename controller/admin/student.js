const multer = require('multer');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
// const Model = require('../../model/schema');

// const { Students, ClassModel } = Model;

const ClassModel = require('../../model/school-class');
const Students = require('../../model/student');
const School = require('../../model/school');

//---------------Storage----------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/student');
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + '-' + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage: storage }).single('file');

const passportStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    try { fs.mkdirSync('public/student', { recursive: true }); } catch (_) { }
    cb(null, 'public/student');
  },
  filename: function (req, file, cb) {
    const rid = (req.body && req.body.rollId) ? String(req.body.rollId) : 'passport';
    cb(null, 'passport-' + rid + '-' + Date.now() + path.extname(file.originalname));
  },
});

const passportUpload = multer({
  storage: passportStorage,
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|jpg|gif|webp)$/i.test(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid image type'));
  }
}).single('passport');

// const url = "mongodb+srv://OGIDI:WAHEEDianho@cluster0.v6rr3.mongodb.net/SRM?retryWrites=true&w=majority"

studentAdmission = (req, res) => {
  ClassModel.find({ schoolId: req.user.schoolId }, 'cname cnameNum').then(classes => {
    res.render('admin/add-student', { classes: classes });
  });
};

dostudentAdmission = (req, res) => {
  const isMultipart = (req.headers && String(req.headers['content-type'] || '').toLowerCase().includes('multipart/form-data'));
  if (req.body.hasOwnProperty('fname') || isMultipart) {
    passportUpload(req, res, async err => {
      if (err) {
        const msg = err && err.code === 'LIMIT_FILE_SIZE' ? 'Passport must be <= 1MB' : (err && err.message) || 'Upload error';
        return res.status(400).json({ message: msg });
      }
      const payload = { ...req.body, schoolId: req.user.schoolId };
      if (payload.fname) payload.fname = String(payload.fname).toUpperCase();

      if (!payload.rollId || payload.rollId.trim() === '') {
        try {
          const school = await School.findById(req.user.schoolId);
          const prefix = school && school.name ? school.name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() : 'STU';
          const count = await Students.countDocuments({ schoolId: req.user.schoolId });
          const seqNum = String(count + 1).padStart(4, '0');
          const currentYear = new Date().getFullYear();
          payload.rollId = `${prefix}/${currentYear}/${seqNum}`;
        } catch (e) {
          const countFallback = await Students.countDocuments({ schoolId: req.user.schoolId });
          payload.rollId = `STU/${new Date().getFullYear()}/${String(countFallback + 1).padStart(4, '0')}`;
        }
      }

      if (req.file && req.file.filename) {
        payload.photoUrl = '/public/student/' + req.file.filename;
      }
      Students.create(payload)
        .then(resp => res.json(resp))
        .catch(err => res.status(400).json({ message: err.message || 'Error creating student', error: err }));
    });
  } else {
    upload(req, res, err => {
      //------------Todo after successful upload----------------//
      const wb = xlsx.readFile(
        `${__dirname}/../../uploads/student/${req.file.filename}`,
        { cellDates: true }
      );

      const ws = wb.Sheets['Student'];

      if (!ws) {
        const err = new Error();
        err.status = 404;
        err.message = 'Invalid Document';
        res.json(err);
        fs.unlinkSync(
          `${__dirname}/../../uploads/student/${req.file.filename}`
        );
        return err;
      } else {
        const data = xlsx.utils.sheet_to_json(ws);

        (async () => {
          const existuser = [];
          for (x in data) {
            const {
              fullname,
              dob,
              gender,
              sclass,
              roll_id,
              phone_no,
              address,
              email,
            } = data[x];
            const user = await Students.findOne({
              rollId: `SRM/2020/0${roll_id}`,
              schoolId: req.user.schoolId
            });

            if (!user) {
              const newStu = await Students.create({
                fname: fullname.toUpperCase(),
                rollId: `SRM/2020/0${roll_id}`,
                gender,
                sclass,
                dob,
                phone_no,
                address,
                email,
                schoolId: req.user.schoolId
              });
            } else {
              existuser.push(user.fname);
            }
          }
          if (existuser.length === 0) {
            res.json('sucess');
          } else {
            const err = new Error();
            err.status = 404;
            err.message = existuser;
            res.json(err);
          }
          fs.unlinkSync(
            `${__dirname}/../../uploads/student/${req.file.filename}`
          );
        })();
      }
    });
  }
};

manageStudent = async (req, res) => {
  try {
    const { sclass } = req.query || {};
    const filter = { schoolId: req.user.schoolId, deleted: { $ne: true } };
    if (sclass) filter.sclass = sclass;

    // Teacher restriction
    if (req.user.role === 'teacher' && req.user.assignedClass) {
      filter.sclass = req.user.assignedClass;
    }

    const [docs, classes] = await Promise.all([
      Students.find(filter),
      ClassModel.find({ schoolId: req.user.schoolId }, 'cname cnameNum')
    ]);
    res.render('admin/manage-student', {
      docs,
      classes,
      selectedClass: sclass || '',
      url: req.url,
    });
  } catch (e) {
    res.render('admin/manage-student', {
      docs: [],
      classes: [],
      selectedClass: '',
      url: req.url,
    });
  }
};

deleteStudent = (req, res) => {
  Students.findOneAndUpdate({ _id: req.params.id, schoolId: req.user.schoolId }, { $set: { deleted: true } }, { new: true })
    .then(resp => res.json(resp))
    .catch(err => res.json(err));
};

getStudents = (req, res) => {
  const query = { schoolId: req.user.schoolId, deleted: { $ne: true } };
  if (req.params.sclass) query.sclass = req.params.sclass;

  // Teacher restriction
  if (req.user.role === 'teacher' && req.user.assignedClass) {
    query.sclass = req.user.assignedClass;
  }

  Students.find(query).populate('result').then(docs => res.json(docs));
};

updateStudent = (req, res) => {
  const isMultipart = (req.headers && String(req.headers['content-type'] || '').toLowerCase().includes('multipart/form-data'));
  if (isMultipart) {
    passportUpload(req, res, err => {
      if (err) {
        const msg = err && err.code === 'LIMIT_FILE_SIZE' ? 'Passport must be <= 1MB' : (err && err.message) || 'Upload error';
        return res.status(400).json({ message: msg });
      }
      const payload = { ...req.body };
      if (req.file && req.file.filename) {
        payload.photoUrl = '/public/student/' + req.file.filename;
      }
      Students.findOneAndUpdate({ _id: req.params.id, schoolId: req.user.schoolId }, { $set: payload }, { new: true })
        .then(() => res.json('success'))
        .catch(err => res.json(err));
    });
  } else {
    Students.findOneAndUpdate({ _id: req.params.id, schoolId: req.user.schoolId }, { $set: req.body }, { new: true })
      .then(() => res.json('success'))
      .catch(err => res.json(err));
  }
};
getStudentUploadTemplate = async (req, res) => {
  try {
    const classId = req.params.classId;

    // Teacher restriction
    if (req.user.role === 'teacher' && req.user.assignedClass && classId !== req.user.assignedClass.toString()) {
      return res.status(403).json({ message: "Unauthorized to get template for this class" });
    }

    // Verify class belongs to school
    const targetClass = await ClassModel.findOne({ _id: classId, schoolId: req.user.schoolId });
    if (!targetClass) return res.status(404).json({ message: "Class not found" });

    // Build a Student sheet template with expected headers
    // Columns expected by bulk importer: fullname, dob, gender, sclass, roll_id, phone_no, address, email
    const headers = ['fullname', 'dob', 'gender', 'sclass', 'roll_id', 'phone_no', 'address', 'email'];

    const rows = [];
    // Prefill 10 empty rows with sclass pre-set to selected class id (if provided)
    for (let i = 0; i < 10; i++) {
      rows.push(['', '', '', classId || '', '', '', '', '']);
    }

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    // Optional: set column widths for readability
    ws['!cols'] = [
      { wch: 25 }, // fullname
      { wch: 12 }, // dob
      { wch: 10 }, // gender
      { wch: 28 }, // sclass (ObjectId)
      { wch: 12 }, // roll_id
      { wch: 14 }, // phone_no
      { wch: 25 }, // address
      { wch: 28 }, // email
    ];

    xlsx.utils.book_append_sheet(wb, ws, 'Student');
    const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=student_template.xlsx');
    return res.send(buffer);
  } catch (e) {
    return res.status(500).json({ message: e?.message || 'Failed to generate template' });
  }
};

module.exports = {
  studentAdmission,
  dostudentAdmission,
  manageStudent,
  deleteStudent,
  getStudents,
  updateStudent,
  getStudentUploadTemplate,
};
