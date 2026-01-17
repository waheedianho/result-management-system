//-------Dependencies---------------------------
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
//==================================================

//---------------Storage----------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/results');
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + '-' + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage: storage }).single('file');
//=============================================================

//-------------Database Model----------------------------------
const ClassModel = require('../../model/school-class');
const Subjects = require('../../model/subject');
const Students = require('../../model/student');
const Result = require("../../model/result");
const {getResult} = require("../student");
const {academic_session, academic_term} = require("../../config");
const SubjectCombination = require("../../model/subject-combination");

// const { Subjects, ClassModel, Students } = require('../../model/schema');
//===========================================================

//This is the only change
result = async (req, res) => {
    let query = { schoolId: req.user.schoolId };
    if (req.user.role === 'teacher' && req.user.assignedClass) {
        query._id = req.user.assignedClass;
    }
    const sclasses = await ClassModel.find(query, 'cname cnameNum');
    res.render('admin/add-result', {
        classes: sclasses,
        subjects: [],
    })
};

addResult = async (req, res, next) => {
    console.log(req.body, "function called and reach server")
  if (req.body.hasOwnProperty('type') && req.body.type === 'json') {
    const { results } = req.body;
      
      // Multi-tenancy & Teacher restriction
      const resultsWithSchool = results.map(r => ({ ...r, schoolId: req.user.schoolId }));
      if (req.user.role === 'teacher') {
          const unauthorized = resultsWithSchool.find(r => r.sclass.toString() !== req.user.assignedClass?.toString());
          if (unauthorized) return res.status(403).json({ message: "Unauthorized to add results for this class" });
      }

      await Result.create(resultsWithSchool);
      res.json({
          type: 'success',
          message: `subject added successfully`,
      });

  } else {
      upload(req, res, async err => {
          if (err) return next(err);

          try {
              const filePath = `${__dirname}/../../uploads/results/${req.file.filename}`;
              const wb = xlsx.readFile(filePath);
              // Expect the exported sheet name you used when generating the template
              const ws = wb.Sheets['Results'];
              if (!ws) {
                  fs.unlinkSync(filePath);
                  return res.status(400).json({message: 'Invalid Document: missing "Results" sheet'});
              }

              // Read as AOA to preserve header structure (merged cells)
              const aoa = xlsx.utils.sheet_to_json(ws, {header: 1, raw: true, defval: ''});

              if (aoa.length < 3) {
                  fs.unlinkSync(filePath);
                  return res.status(400).json({message: 'Invalid template: not enough rows'});
              }

              // Row 0: subject names (merged across two columns)
              // Row 1: "CA" / "Exam" under each subject
              const headerRow1 = aoa[0];
              const headerRow2 = aoa[1];

              // Validate first column header
              const fullnameHeader = (headerRow1[0] || '').toString().trim().toLowerCase();
              if (fullnameHeader !== 'fullname') {
                  fs.unlinkSync(filePath);
                  return res.status(400).json({message: 'Invalid template: first column must be "Fullname"'});
              }

              // Build subject -> column indices map
              // Starting from column index 1, every pair is CA/Exam for the same subject
              const subjectCols = [];
              for (let c = 1; c < headerRow1.length; c += 2) {
                  const subjectName = (headerRow1[c] || '').toString().trim();
                  const caLabel = (headerRow2[c] || '').toString().trim().toLowerCase();
                  const examLabel = (headerRow2[c + 1] || '').toString().trim().toLowerCase();

                  if (!subjectName || caLabel !== 'ca' || examLabel !== 'exam') {
                      fs.unlinkSync(filePath);
                      return res.status(400).json({message: 'Invalid template: expected Subject with CA/Exam columns'});
                  }

                  subjectCols.push({
                      subjectName,
                      caCol: c,
                      examCol: c + 1
                  });
              }

              // Preload subject-combinations for the class to resolve subject -> subjectCombinationId
              // If class is passed via query/body, adjust accordingly. Otherwise, infer per-student later.
              const classId = req.body.classId || req.query.classId;

              // Teacher restriction
              if (req.user.role === 'teacher' && classId.toString() !== req.user.assignedClass?.toString()) {
                  fs.unlinkSync(filePath);
                  return res.status(403).json({ message: "Unauthorized to upload results for this class" });
              }
              let subjectCombosByName = new Map();

              if (classId) {
                  const combos = await SubjectCombination.find({class: classId}).populate('subject');
                  subjectCombosByName = new Map(
                      combos.map(sc => [sc.subject.sname.toString().trim().toLowerCase(), sc._id])
                  );
              }

              // Process each student row (from row index 2 onward)
              const ops = [];
              for (let r = 2; r < aoa.length; r++) {
                  const row = aoa[r];
                  if (!row || row.length === 0) continue;

                  const fullName = (row[0] || '').toString().trim();
                  if (!fullName) continue;

                  const student = await Students.findOne({fname: fullName});
                  if (!student) continue; // skip unknown names

                  // If classId not provided, take from student
                  const effectiveClassId = classId || student.sclass;

                  // If we didn’t preload combos (no classId), load once per student class
                  if (!classId && effectiveClassId && subjectCombosByName.size === 0) {
                      const combos = await SubjectCombination.find({class: effectiveClassId}).populate('subject');
                      subjectCombosByName = new Map(
                          combos.map(sc => [sc.subject.sname.toString().trim().toLowerCase(), sc._id])
                      );
                  }

                  for (const {subjectName, caCol, examCol} of subjectCols) {
                      const ca = Number(row[caCol] ?? '');
                      const exam = Number(row[examCol] ?? '');
                      const ca_score = Number.isFinite(ca) ? ca : 0;
                      const exam_score = Number.isFinite(exam) ? exam : 0;

                      // Resolve subject-combination id by subject name
                      const scId = subjectCombosByName.get(subjectName.toLowerCase());
                      if (!scId) continue; // skip subjects not in combination for class

                      // Upsert per unique key (student+subject+session+term)
                      ops.push({
                          updateOne: {
                              filter: {
                                  student: student._id,
                                  subject: scId,
                                  session: academic_session,
                                  term: academic_term,
                                  schoolId: req.user.schoolId
                              },
                              update: {
                                  $set: {
                                      sclass: effectiveClassId,
                                      ca_score,
                                      exam_score,
                                      totalScore: ca_score + exam_score,
                                      grade: calculatrGrade(ca_score + exam_score),
                                      schoolId: req.user.schoolId
                                  }
                              },
                              upsert: true
                          }
                      });
                  }
              }

              if (ops.length === 0) {
                  fs.unlinkSync(filePath);
                  return res.status(400).json({message: 'No valid rows to process'});
              }

              await Result.bulkWrite(ops, {ordered: false});
              fs.unlinkSync(filePath);

              return res.json({type: 'success', message: 'Results uploaded successfully'});
          } catch (e) {
              try {
                  fs.unlinkSync(`${__dirname}/../../uploads/results/${req.file.filename}`);
              } catch {
              }
              return next(e);
          }

      });

    // upload(req, res, err => {
    //   if (!err) {
    //     const wb = xlsx.readFile(
    //       `${__dirname}/../../uploads/results/${req.file.filename}`
    //     );
    //
    //     const ws = wb.Sheets['Science'];
    //
    //     if (!ws) {
    //       const err = new Error();
    //       err.status = 404;
    //       err.message = 'Invalid Document';
    //       res.json(err);
    //       fs.unlinkSync(
    //         `${__dirname}/../../uploads/results/${req.file.filename}`
    //       );
    //       return err;
    //     } else {
    //       const data = xlsx.utils.sheet_to_json(ws);
    //
    //       //pushing data into DB
    //       (async function () {
    //         try {
    //           const totalSubjectErr = [];
    //           for (record in data) {
    //             let pos = record;
    //             const student = await Students.findOne({
    //               fname: data[pos].Fullname.toUpperCase(),
    //             });
    //             delete data[pos].Fullname;
    //
    //             const subscore = Object.entries(data[pos]);
    //
    //             const errSubject = [];
    //             subscore.map(async element => {
    //               const [subject, score] = element;
    //               Number(score);
    //               //---------------------adjustment-----------------------------//
    //               const resConfirm = await student.result.find(
    //                 test => test.subject === subject.toUpperCase()
    //               );
    //               if (!resConfirm) {
    //                 let grade = '-';
    //                 if (score < 39) grade = 'F';
    //                 else if (score > 39 && score <= 49) grade = 'D';
    //                 else if (score > 49 && score <= 59) grade = 'C';
    //                 else if (score > 59 && score <= 69) grade = 'B2';
    //                 else if (score > 69 && score <= 79) grade = 'B1';
    //                 else if (score > 79 && score <= 89) grade = 'A';
    //                 else if (score > 89 && score <= 100) grade = 'A+';
    //                 else grade;
    //                 student.result.push({
    //                   subject: subject.toUpperCase(),
    //                   score: score,
    //                   grade: grade,
    //                 });
    //               } else {
    //                 errSubject.push(resConfirm.subject);
    //               }
    //             });
    //             await errSubject;
    //             errSubject.length === 0
    //               ? student.save()
    //               : totalSubjectErr.push({
    //                   name: student.fname,
    //                   errSubject: errSubject,
    //                 });
    //           }
    //           if (totalSubjectErr.length === 0) {
    //             res.json({ done: 'success' });
    //             fs.unlinkSync(
    //               `${__dirname}/../../uploads/results/${req.file.filename}`
    //             );
    //           } else {
    //             const err = new Error();
    //             err.status = 404;
    //             err.message = totalSubjectErr;
    //             res.json(err);
    //             fs.unlinkSync(
    //               `${__dirname}/../../uploads/results/${req.file.filename}`
    //             );
    //           }
    //         } catch (error) {
    //           next(error);
    //         }
    //       })();
    //     }
    //   } else {
    //     next(err);
    //   }
    // });
  }
};

calculatrGrade = (totalScore) => {
    if (totalScore >= 70) return 'A';
    if (totalScore >= 60) return 'B';
    if (totalScore >= 50) return 'C';
    if (totalScore >= 45) return 'D';
    if (totalScore >= 40) return 'E';
    return 'F';
};

manageResult = async (req, res) => {
    const q = { ...req.query };
    q.schoolId = req.user.schoolId;

    if (req.user.role === 'teacher' && req.user.assignedClass) {
        q.sclass = req.user.assignedClass.toString();
    }

    if (q.sclass && /^[a-f0-9]{24}$/i.test(q.sclass)) {
        q.sclass = new mongoose.Types.ObjectId(q.sclass);
    }
    if (q.student && /^[a-f0-9]{24}$/i.test(q.student)) {
        q.student = new mongoose.Types.ObjectId(q.student);
    }
    
    let classQuery = { schoolId: req.user.schoolId };
    if (req.user.role === 'teacher' && req.user.assignedClass) {
        classQuery._id = req.user.assignedClass;
    }
    const classes = await ClassModel.find(classQuery);

    const studentResultGroouped = await Result.aggregate([
        { $match: { session: academic_session, term: academic_term, ...q } },
        { $group: {
                _id: "$student",
                // results: { $push: "$$ROOT" },
                count: { $sum: 1 },
                lastUpdatedDate: { $max: "$updatedAt" }
            }
        },

        { $lookup: { from: "students", localField: "_id", foreignField: "_id", as: "student" } },
        { $unwind: "$student" }
    ]);
    const students = studentResultGroouped?.map(el =>  ({ ...el.student, count: el.count, updatedAt: el.lastUpdatedDate }))
    console.log(students)
    console.log(req.url, "something is wrong")
    res.render('admin/manage-results', { students, url: req.url, classes });

  // Students.find({}).populate('result').then(students => {
  //     // console.log(students[0].result)
  //
  // });
};

deleteResult = async (req, res) => {
    const resultId = req.params.id;
    const query = { _id: resultId, schoolId: req.user.schoolId };
    
    if (req.user.role === 'teacher' && req.user.assignedClass) {
        query.sclass = req.user.assignedClass;
    }
    
    const resp = await Result.findOneAndDelete(query);
    if (!resp) return res.status(403).json({ message: "Unauthorized or not found" });
    res.json(resp);
};

updateReSult = async (req, res) => {
    const id = req.params.id;
    const { ca_score, exam_score } = req.body;
    const query = { _id: id, schoolId: req.user.schoolId };
    if (req.user.role === 'teacher' && req.user.assignedClass) {
        query.sclass = req.user.assignedClass;
    }
    const resp = await Result.findOneAndUpdate(query, { ca_score, exam_score }, { new: true });
    if (!resp) return res.status(403).json({ message: "Unauthorized or not found" });
    res.json(resp);
  // delete req.body.studentId;
  // Students.findById(studentId)
  //   .then(stu => {
  //     for ([key, value] of Object.entries(req.body)) {
  //       stu.result.id(req.params.id)[key] = value;
  //     }
  //     stu.save().then(resp => {
  //       res.json(resp);
  //     });
  //   })
  //   .catch(err => console.log(err));
};

getResultUploadTemplate = async (req, res) =>  {
    const classId = req.params.classId;

    // Teacher restriction
    if (req.user.role === 'teacher' && classId.toString() !== req.user.assignedClass?.toString()) {
        return res.status(403).json({ message: "Unauthorized to get template for this class" });
    }

    const classSubjects = await SubjectCombination.find({ class: classId, schoolId: req.user.schoolId }).populate(['subject', 'class']);
    const students  = await Students.find({ sclass: classId, schoolId: req.user.schoolId });

    const className = classSubjects[0]?.class?.cname

    const subjects = classSubjects?.map(sub => sub.subject.sname);
    const studentNames = students?.map(stu => stu.fname);

    // Build a two-row header: Row1 -> subject names spanning two cols; Row2 -> CA / Exam
    const headerRow1 = ['Fullname', ...subjects.flatMap(s => [s, null])]; // second cell will be merged later
    const headerRow2 = [' ', ...subjects.flatMap(() => ['CA', 'Exam'])];

    // Build data rows: each student with empty CA/Exam cells for each subject
    const rows = studentNames.map(name => {
        return [name, ...subjects.flatMap(() => ['', ''])];
    });

    const aoa = [headerRow1, headerRow2, ...rows];
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet(aoa);

    // Merge subject headers to span CA & Exam columns
    // Start at column 1 (B in Excel), since A is Fullname
    let colStart = 1;
    for (let i = 0; i < subjects.length; i++) {
        // Merge Row1 colStart..colStart+1
        worksheet['!merges'] = worksheet['!merges'] || [];
        worksheet['!merges'].push({
            s: { r: 0, c: colStart },     // start: row 0, col B+(i*2)
            e: { r: 0, c: colStart + 1 }  // end:   row 0, next col
        });
        colStart += 2;
    }

    // Optional: set column widths for readability
    worksheet['!cols'] = [
        { wch: 20 }, // Fullname
        ...subjects.flatMap(() => [{ wch: 12 }, { wch: 10 }]) // CA / Exam
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, "Results");
    const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // const workbook = xlsx.utils.book_new();
    // console.log(data)
    // const worksheet = xlsx.utils.json_to_sheet(data)



    // xlsx.utils.book_append_sheet(workbook, worksheet, "Results");
    // const buffer = xlsx.write(workbook,  { bookType: 'xlsx', type: 'buffer' }); //array

    xlsx.writeFile(workbook, "test.xlsx")
    console.log("successfully write the file")

    // 4. Set the appropriate headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=result_template.xlsx');

    // 5. Send the file buffer in the response
    res.send(buffer);
}



getResults = async (req, res) => {
    const query = { ...(req.query || {}), schoolId: req.user.schoolId };
    if (req.user.role === 'teacher' && req.user.assignedClass) {
        query.sclass = req.user.assignedClass;
    }
    const results = await Result.find({...query, session: academic_session, term: academic_term }).populate(['subject', 'student']);
    console.log(results);
    return res.json(results);
}
generateClassResultsPage = async (req, res) => {
    try {
        let classId = req.query.sclass;
        if (req.user.role === 'teacher' && req.user.assignedClass) {
            classId = req.user.assignedClass.toString();
        }
        if (!classId) {
            return res.status(400).send('Missing sclass');
        }
        const filter = { sclass: classId, session: academic_session, term: academic_term, schoolId: req.user.schoolId };
        // Populate student and nested subject (SubjectCombination -> Subject)
        const items = await Result.find(filter)
            .populate({
                path: 'subject',
                populate: { path: 'subject' }
            })
            .populate('student')
            .sort({ 'student.fname': 1 });

        // Group by student
        const map = new Map();
        for (const it of items) {
            const stu = it.student;
            if (!stu) continue;
            const key = String(stu._id);
            if (!map.has(key)) {
                map.set(key, {
                    _id: stu._id,
                    name: stu.fname || stu.name || '',
                    rollId: stu.rollId || '',
                    sclass: stu.sclassName || stu.sclass || '',
                    term: academic_term,
                    session: academic_session,
                    results: []
                });
            }
            const subjName = it?.subject?.subject?.sname || it?.subject?.sname || it?.subjectName || '';
            map.get(key).results.push({
                subject: subjName,
                ca: it.ca_score,
                exam: it.exam_score,
                total: it.totalScore,
                grade: it.grade
            });
        }
        const students = Array.from(map.values());
        return res.render('admin/class-results', { students });
    } catch (e) {
        return res.status(500).send(e?.message || 'Server error');
    }
};

generateClassAnnualResultsPage = async (req, res) => {
    try {
        let sclass = req.query.sclass;
        if (req.user.role === 'teacher' && req.user.assignedClass) {
            sclass = req.user.assignedClass.toString();
        }
        const session = String(req.query.session || academic_session);
        const term = String(req.query.term || academic_term);   
        if (!sclass) {
            return res.status(400).send('Missing sclass');
        }
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const absUrl = (u) => {
            if (!u) return '';
            if (/^https?:\/\//i.test(String(u))) return String(u);
            const p = String(u);
            return p.startsWith('/') ? baseUrl + p : baseUrl + '/' + p;
        };

        const students = await Students.find({ sclass, schoolId: req.user.schoolId }).select(['_id','fname','rollId','gender','dob','sclass', 'photoUrl']).populate('sclass').lean();
        if (!students || students.length === 0) {
            return res.status(404).send('No students found for class');
        }

        console.log(students, "============================")

        const results = await Result.find({ sclass, session, schoolId: req.user.schoolId }).select(['student','term','totalScore','subject']).populate({ path: 'subject' }).lean();
        if (!results || results.length === 0) {
            return res.status(404).send('No results found for class in session');
        }

        function remarksFromGrade(grade) {
            if (grade === 'A') return 'Excellent';
            if (grade === 'B') return 'Very Good';
            if (grade === 'C') return 'Good';
            if (grade === 'D') return 'Pass';
            if (grade === 'E') return 'Pass';
            return 'Fail';
        }

        function toOrdinal(n) {
            const s = ["th","st","nd","rd"], v = n % 100;
            return n + (s[(v-20)%10] || s[v] || s[0]);
        }

        const byStudent = new Map();
        for (const r of results) {
            const stuId = String(r.student);
            const subjName = r.subject && r.subject.subject ? r.subject.subject : null;
            if (!subjName) continue;
            if (!byStudent.has(stuId)) byStudent.set(stuId, new Map());
            const m = byStudent.get(stuId);
            if (!m.has(subjName)) m.set(subjName, { First: null, Second: null, Third: null });
            const bucket = m.get(subjName);
            if (r.term === 'First') bucket.First = Number(r.totalScore) || 0;
            else if (r.term === 'Second') bucket.Second = Number(r.totalScore) || 0;
            else if (r.term === 'Third') bucket.Third = Number(r.totalScore) || 0;
        }

        const subjectTotalsAcrossClass = new Map();
        for (const [sid, subjMap] of byStudent.entries()) {
            for (const [name, terms] of subjMap.entries()) {
                const vals = [terms.First, terms.Second, terms.Third].filter(v => v !== null);
                const total = vals.reduce((a,b)=>a+b,0);
                if (!subjectTotalsAcrossClass.has(name)) subjectTotalsAcrossClass.set(name, []);
                subjectTotalsAcrossClass.get(name).push({ sid, total });
            }
        }

        const classPopulation = students.length;

        const overallAgg = await Result.aggregate([
            { $match: { sclass: new mongoose.Types.ObjectId(String(sclass)), session: String(session), schoolId: req.user.schoolId } },
            { $group: { _id: '$student', total: { $sum: '$totalScore' } } },
            { $sort: { total: -1 } }
        ]);

        const reports = [];
        for (const stu of students) {
            const subjMap = byStudent.get(String(stu._id)) || new Map();
            const subjects = [];
            const gradeCounts = { A:0, B:0, C:0, D:0, E:0, F:0 };

            let totalMarksObtained = 0;
            for (const [name, terms] of subjMap.entries()) {
                const f = terms.First; const s = terms.Second; const t = terms.Third;
                const vals = [f, s, t].filter(v => v !== null);
                const sum = vals.reduce((a,b)=>a+b,0);
                totalMarksObtained += sum;
                const average = vals.length ? Number((sum/vals.length).toFixed(2)) : 0;
                const grade = calculatrGrade(average);
                gradeCounts[grade]++;
                const remarks = remarksFromGrade(grade);

                let highest = null, lowest = null, classAverage = null, rank = null;
                const totals = subjectTotalsAcrossClass.get(name) || [];
                if (totals.length) {
                    highest = Math.max(...totals.map(x=>x.total));
                    lowest = Math.min(...totals.map(x=>x.total));
                    classAverage = Number((totals.reduce((a,b)=>a+b.total,0)/totals.length).toFixed(2));
                    const sorted = totals.slice().sort((a,b)=>b.total-a.total);
                    const my = sorted.findIndex(x=>x.sid === String(stu._id));
                    rank = my >= 0 ? my+1 : null;
                }

                subjects.push({
                    name,
                    firstTerm: f,
                    secondTerm: s,
                    thirdTerm: t,
                    average,
                    grade,
                    remarks,
                    rank,
                    highest,
                    lowest,
                    classAverage
                });
            }

            const totalMarksObtainable = subjects.length * 300;
            const annualAverageScore = subjects.length ? Number((subjects.reduce((a,s)=>a+s.average,0)/subjects.length).toFixed(2)) : 0;
            const annualAverageGrade = calculatrGrade(annualAverageScore);
            const performanceRemarks = remarksFromGrade(annualAverageGrade);

            let classPosition = null;
            const myPos = overallAgg.findIndex(r => String(r._id) === String(stu._id));
            if (myPos >= 0) classPosition = toOrdinal(myPos+1);
            const promotionStatus = annualAverageScore >= 50 && academic_term === 'Third' ? 'Promoted' : '';

                const data = {
                    schoolName: "Al-Fawz Global Academy",
                    schoolAddress: "Olose Area, Off Mele-Koka Road, Moniya, Ibadan.",
                    schoolPhone: "0805 329 3540, 0803 544 6499",
                    schoolEmail: "alfawzglobalacademy@gmail.com",
                    schoolWebsite: "",
                    student: {
                        name: stu.fname,
                        class: stu.sclass && stu.sclass.cname ? stu.sclass.cname : '',
                        session: String(session),
                        term: academic_term,
                        gender: stu.gender || '',
                        admissionNo: stu.rollId,
                        dob: stu.dob ? new Date(stu.dob).toISOString().slice(0,10) : '',
                        parent: 'N/A',
                        photoUrl: absUrl(stu.photoUrl ? String(stu.photoUrl) : '/public/student-photo-portrait.jpg'),
                        results: []
                    },
                    subjects,
                    summary: {
                        totalMarksObtained: Number(totalMarksObtained.toFixed(2)),
                    totalMarksObtainable,
                    classPopulation,
                    annualAverageScore,
                    annualAverageGrade,
                    performanceRemarks,
                    classPosition,
                    promotionStatus
                },
                gradeScale: ['A','B','C','D','E','F'],
                gradeDistribution: [gradeCounts.A, gradeCounts.B, gradeCounts.C, gradeCounts.D, gradeCounts.E, gradeCounts.F],
                qrCodeUrl: `/public/qr-code.png`,
                gradeScaleDescription: '>= 70: A (Excellent), 60-69: B (Very Good), 50-59: C (Good), 45-49: D (Pass), 40-44: E (Pass), < 40: F (Fail)'
            };

            reports.push(data);
        }

        return res.render('admin/class-annual-results', { reports });
    } catch (e) {
        return res.status(500).send(e?.message || 'Server error');
    }
};

module.exports = {
  result,
  addResult,
  manageResult,
  deleteResult,
  updateReSult,
    getResults,
    getResultUploadTemplate,
    generateClassResultsPage,
    generateClassAnnualResultsPage
};
