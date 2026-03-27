// const { Students } = require('../model/schema');
const Students = require('../model/student');
const ClassModel = require("../model/school-class");
const {academic_term, academic_session} = require("../config");
const Result = require("../model/result");
const School = require("../model/school");
const { calculateGrade } = require("../utils/grade");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

function gradeFromScore(total, scale) {
    const { grade } = calculateGrade(total, scale);
    return grade;
}

function remarksFromGrade(grade, scale) {
    if (!scale) {
        if (grade === 'A') return 'Excellent';
        if (grade === 'B') return 'Very Good';
        if (grade === 'C') return 'Good';
        if (grade === 'D') return 'Pass';
        if (grade === 'E') return 'Pass';
        return 'Fail';
    }
    const found = scale.find(s => s.grade === grade);
    return found ? found.remark : 'Fail';
}

function toOrdinal(n) {
    const s = ["th","st","nd","rd"], v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
}

async function getAnnualResult(req, res, next) {
    try {
        const rollId = req.body.rollId || req.query.rollId;
        const sclass = req.body.sclass || req.query.sclass;
        const session = req.body.session || academic_session;
        const term  = req.body.term || academic_term;
        if (!rollId || !sclass) {
            const error = { msg: 'Please fill all the fields' };
            return res.redirect(`/student/login?error=${JSON.stringify(error)}`);
        }

        const student = await Students.findOne({ rollId }).populate(['sclass', 'schoolId']);
        if (!student) {
            return res.redirect(`/student/login?error=${JSON.stringify({msg: 'Invalid Roll Id'})}`);
        }
        
        // Fetch School Config
        const school = await School.findById(student.schoolId);
        const gradingScale = school?.gradingScale || [];
        const reportConfig = school?.reportCardConfig || {};
        if (student.sclass._id.toString() !== sclass) {
            return res.redirect(`/student/login?error=${JSON.stringify({msg: 'Invalid Class'})}`);
        }

        const studentResults = await Result.find({ student: student._id, sclass, session }).populate(['subject']);

        const buckets = new Map();
        for (const r of studentResults) {
            const subjectName = r.subject && r.subject.subject ? r.subject.subject : null;
            if (!subjectName) continue;
            if (!buckets.has(subjectName)) buckets.set(subjectName, { First: null, Second: null, Third: null });
            const b = buckets.get(subjectName);
            if (r.term === 'First') b.First = Number(r.totalScore) || 0;
            else if (r.term === 'Second') b.Second = Number(r.totalScore) || 0;
            else if (r.term === 'Third') b.Third = Number(r.totalScore) || 0;
        }

        const subjects = [];
        const gradeCounts = { A:0, B:0, C:0, D:0, E:0, F:0 };

        for (const [name, terms] of buckets.entries()) {
            const vals = [terms.First, terms.Second, terms.Third].filter(v => v !== null);
            const sum = vals.reduce((a,b)=>a+b,0);
            const average = vals.length ? Number((sum/vals.length).toFixed(2)) : 0;
            const grade = gradeFromScore(average, gradingScale);
            if (!gradeCounts[grade]) gradeCounts[grade] = 0;
            gradeCounts[grade]++;
            const remarks = remarksFromGrade(grade, gradingScale);

            let highest = null, lowest = null, classAverage = null, rank = null;

            const subjectRef = await mongoose.model('subject-combinations').findOne({ subject: name, class: sclass }).select('_id');
            if (subjectRef && subjectRef._id) {
                const classSubjectResults = await Result.find({ sclass, session, subject: subjectRef._id }).select(['student','term','totalScore']);
                const perStudent = new Map();
                for (const r of classSubjectResults) {
                    const id = String(r.student);
                    if (!perStudent.has(id)) perStudent.set(id, { First: null, Second: null, Third: null });
                    const ps = perStudent.get(id);
                    if (r.term === 'First') ps.First = Number(r.totalScore) || 0;
                    else if (r.term === 'Second') ps.Second = Number(r.totalScore) || 0;
                    else if (r.term === 'Third') ps.Third = Number(r.totalScore) || 0;
                }
                const totals = [];
                for (const [sid, t] of perStudent.entries()) {
                    const arr = [t.First, t.Second, t.Third].filter(v => v !== null);
                    const total = arr.reduce((a,b)=>a+b,0);
                    totals.push({ sid, total });
                }
                if (totals.length) {
                    highest = Math.max(...totals.map(x=>x.total));
                    lowest = Math.min(...totals.map(x=>x.total));
                    classAverage = Number((totals.reduce((a,b)=>a+b.total,0)/totals.length).toFixed(2));
                    const sorted = totals.sort((a,b)=>b.total-a.total);
                    const my = sorted.findIndex(x=>x.sid === String(student._id));
                    rank = my >= 0 ? my+1 : null;
                }
            }

            subjects.push({
                name,
                firstTerm: terms.First,
                secondTerm: terms.Second,
                thirdTerm: terms.Third,
                average,
                grade,
                remarks,
                rank,
                highest,
                lowest,
                classAverage
            });
        }

        const classPopulation = await Students.countDocuments({ sclass });
        const totalMarksObtained = subjects.reduce((a,s)=>a + (s.firstTerm||0) + (s.secondTerm||0) + (s.thirdTerm||0), 0);
        const totalMarksObtainable = subjects.length * 300;
        const annualAverageScore = subjects.length ? Number((subjects.reduce((a,s)=>a+s.average,0)/subjects.length).toFixed(2)) : 0;
        const annualAverageGrade = gradeFromScore(annualAverageScore, gradingScale);
        const performanceRemarks = remarksFromGrade(annualAverageGrade, gradingScale);

        const overallAgg = await Result.aggregate([
            { $match: { sclass: new ObjectId(String(sclass)), session: String(session) } },
            { $group: { _id: '$student', total: { $sum: '$totalScore' } } },
            { $sort: { total: -1 } }
        ]);
        let classPosition = null;
        const myPos = overallAgg.findIndex(r => String(r._id) === String(student._id));
        if (myPos >= 0) classPosition = toOrdinal(myPos+1);

        const promotionStatus = annualAverageScore >= 50 && academic_term === 'Third' ? 'Promoted' : '';

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const absUrl = (u) => {
            if (!u) return '';
            if (/^https?:\/\//i.test(String(u))) return String(u);
            const p = String(u);
            return p.startsWith('/') ? baseUrl + p : baseUrl + '/' + p;
        };

        const data = {
            schoolName: reportConfig.schoolName || school.name || "Al-Fawz Global Academy",
            schoolAddress: reportConfig.address || school.address || "Olose Area, Off Mele-Koka Road, Moniya, Ibadan.",
            schoolPhone: reportConfig.phone || school.phone || "0805 329 3540, 0803 544 6499",
            schoolEmail: reportConfig.email || school.email || "alfawzglobalacademy@gmail.com",
            schoolWebsite: reportConfig.website || "",
            reportConfig: reportConfig, // Pass full config for template logic
            student: {
                name: student.fname,
                class: student.sclass && student.sclass.cname ? student.sclass.cname : '',
                session: String(session),
                term: term,
                gender: student.gender || '',
                admissionNo: student.rollId,
                dob: student.dob ? new Date(student.dob).toISOString().slice(0,10) : '',
                parent: 'N/A',
                photoUrl: absUrl(student.photoUrl ? String(student.photoUrl) : '/public/student-photo-portrait.jpg')
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

        return res.render('test/test', data);
    } catch (err) {
        return next(err);
    }
}

/////////// Student Login ///////////////////////
login = async (req, res) => {
    const classes = await ClassModel.find({});
    const error = req?.query?.error;
    res.render('student', {
        classes,
        error: error ? JSON.parse(error) : null,
    });
};
/////////////////// end /////////////////////////

//////// getting result /////////////////////////////
getResult = async (req, res, next) => {
  if (!req.body.rollId || !req.body.sclass) {
    const error = { msg: 'Please fill all the fields' };
    res.redirect(`/student/login?error=${JSON.stringify(error)}`);
  } else {
    let { rollId, sclass } = req.body;
      console.log(rollId, sclass)
      const student = await Students.findOne({rollId: rollId}).populate('sclass');
      if (!student) {
          res.redirect(`/student/login?error=${JSON.stringify({msg: 'Invalid Roll Id'})}`);
      }

      const results = await Result.find({
          student: student._id,
          sclass,
          term: academic_term,
          session: academic_session
      }).populate(['sclass', 'subject', 'student']);


      const studentResult = {
          name: student.fname,
          rollId: student.rollId,
          schoolName: reportConfig.schoolName || school.name,
          sclass: student.sclass.cname,
          session: academic_session,
          term: academic_term,
          date: new Date().toLocaleDateString(),
          results: results?.map(res => ({
              subject: res.subject.subject,
              ca: res.ca_score,
              exam: res.exam_score,
              total: res.totalScore,
              grade: res?.grade
          }))

      }

      res.render('result_new', { student: studentResult  });

  }
};
///////////////////////////// end //////////////////////////

renderingSampleTemplate = async (req, res) => {

    const data = {
  // School information
  schoolName: "WISDOM PLACE ACADEMY IDAH",
  schoolAddress: "BEHIND NAVAL QUARTERS, IDAH LGA, KOGI STATE. P.O. BOX 69, IDAH",
  schoolPhone: "08100983387, 08065724428",
  schoolEmail: "wisdomplacecademyidah@gmail.com",
  schoolWebsite: "www.wisdomplacecademy.inteps.cloud",
  
  // Student information
  student: {
    name: "Darius Ekopka ABAH",
    class: "JSS 2A",
    session: "2024/2025",
    term: "",
    gender: "Male",
    admissionNo: "WPA0018",
    dob: "2013-05-15",
    parent: "Mr. Patrick Ogwu Abah (Guardian)",
    photoUrl: "/student-photo-portrait.jpg"
  },
  
  // Subjects array
  subjects: [
    { name: "English Studies", firstTerm: 87, secondTerm: 88, thirdTerm: 73, average: "82.67", grade: "A1", remarks: "Excellent", rank: 5, highest: "94.00", lowest: "30.87", classAverage: "66.56" },
    { name: "Mathematics", firstTerm: 77, secondTerm: 58, thirdTerm: 45, average: "60.00", grade: "B2", remarks: "Credit", rank: 11, highest: "91.33", lowest: "24.67", classAverage: "45.79" },
    // ... add all other subjects
  ],
  
  // Performance summary
  summary: {
    totalMarksObtained: "1,229.67",
    totalMarksObtainable: "1600",
    classPopulation: "40",
    annualAverageScore: "75.60",
    annualAverageGrade: "A1",
    performanceRemarks: "Excellent",
    classPosition: "5th",
    promotionStatus: "Promoted"
  },
  
  // Grade analysis
  gradeScale: ["A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9"],
  gradeDistribution: [6, 9, 0, 1, 0, 0, 0, 0, 0],
  
  // Footer
  qrCodeUrl: "/qr-code.png",
  gradeScaleDescription: "75 - 100: A1 (Excellent), 70 - 74: B2 (Very Good), 65 - 69: B3 (Good), 60 - 64: C4 (Credit), 55 - 59: C5 (Credit), 50 - 54: C6 (Credit), 45 - 49: D7 (Pass), 40-44: E8 (Pass)"
      };

// Render the template
// res.render('report-card', data);
    res.render('test/test', data);
}

module.exports = {
  login,
  getResult,
  renderingSampleTemplate,
  getAnnualResult,
};
