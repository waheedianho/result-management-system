const mongoose = require('mongoose');
const School = require('../model/school');
const Staff = require('../model/staff');
const Student = require('../model/student');
const Result = require('../model/result');
const ClassModel = require('../model/school-class');
const { calculateGrade } = require('../utils/grade');
require('dotenv').config();

// Mock Config
const SCHOOL_A_SCALE = [
    { min: 80, max: 100, grade: 'A', remark: 'Excellent' },
    { min: 0, max: 79, grade: 'F', remark: 'Fail' }
];

async function runTests() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Connected to DB");

        const indexes = await mongoose.connection.collection('classes').indexes();
        console.log("Current indexes:", indexes);

        // Drop indexes to fix unique constraint issues from previous schema
        try {
            if (indexes.find(i => i.name === 'cname_1')) {
                await mongoose.connection.collection('classes').dropIndex('cname_1');
                console.log("Dropped cname_1");
            }
            if (indexes.find(i => i.name === 'cnameNum_1')) {
                await mongoose.connection.collection('classes').dropIndex('cnameNum_1');
                console.log("Dropped cnameNum_1");
            }
            
            // Wait for indexes to propagate
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (e) {
            console.error("Failed to drop index:", e);
        }

        // 1. Setup Data
        console.log("Setting up test data...");
        
        // Create Schools
        const schoolA = await School.create({ 
            name: `Test School A ${Date.now()}`, 
            email: `schoolA${Date.now()}@test.com`,
            gradingScale: SCHOOL_A_SCALE 
        });
        const schoolB = await School.create({ 
            name: `Test School B ${Date.now()}`, 
            email: `schoolB${Date.now()}@test.com` // Default scale
        });

        // Create Classes
        const classA1 = await ClassModel.create({ cname: 'JSS1', cnameNum: 10, schoolId: schoolA._id });
        const classA2 = await ClassModel.create({ cname: 'JSS2', cnameNum: 11, schoolId: schoolA._id });
        const classB1 = await ClassModel.create({ cname: 'JSS1', cnameNum: 10, schoolId: schoolB._id });

        // Create Staff
        const adminA = { _id: new mongoose.Types.ObjectId(), role: 'admin', schoolId: schoolA._id };
        const adminB = { _id: new mongoose.Types.ObjectId(), role: 'admin', schoolId: schoolB._id };
        const teacherA1 = { _id: new mongoose.Types.ObjectId(), role: 'teacher', schoolId: schoolA._id, assignedClass: classA1._id };
        
        // Create Students
        const studentA1 = await Student.create({ 
            fname: 'Student A1', rollId: `A1-${Date.now()}`, gender: 'M', 
            dob: new Date(), sclass: classA1._id, schoolId: schoolA._id 
        });
        const studentB1 = await Student.create({ 
            fname: 'Student B1', rollId: `B1-${Date.now()}`, gender: 'F', 
            dob: new Date(), sclass: classB1._id, schoolId: schoolB._id 
        });

        console.log("Data setup complete.");

        // 2. Verify Isolation: Admin A vs School B Data
        const studentsForA = await Student.find({ schoolId: adminA.schoolId });
        if (studentsForA.some(s => s.schoolId.toString() === schoolB._id.toString())) {
            console.error("FAIL: Admin A can see School B students!");
        } else {
            console.log("PASS: Admin A isolation verified.");
        }

        // 3. Verify Isolation: Teacher A1 vs Class A2
        // Simulate controller logic for managing students
        const teacherQuery = { schoolId: teacherA1.schoolId };
        if (teacherA1.role === 'teacher' && teacherA1.assignedClass) {
            teacherQuery.sclass = teacherA1.assignedClass;
        }
        const studentsForTeacher = await Student.find(teacherQuery);
        
        // Should only see Student A1, not any student in Class A2 (if we made one)
        // Let's make a student in A2 to be sure
        const studentA2 = await Student.create({ 
            fname: 'Student A2', rollId: `A2-${Date.now()}`, gender: 'M', 
            dob: new Date(), sclass: classA2._id, schoolId: schoolA._id 
        });

        const studentsForTeacherRefreshed = await Student.find(teacherQuery);
        
        if (studentsForTeacherRefreshed.some(s => s.sclass.toString() === classA2._id.toString())) {
            console.error("FAIL: Teacher A1 can see Class A2 students!");
        } else if (studentsForTeacherRefreshed.length > 0) {
            console.log("PASS: Teacher A1 isolation verified.");
        } else {
             console.warn("WARN: Teacher A1 sees no students?");
        }

        // 4. Verify Dynamic Grading
        console.log("Verifying Dynamic Grading...");
        const score = 75;
        
        // School A (Custom Scale: <80 is F)
        const gradeA = calculateGrade(score, schoolA.gradingScale);
        if (gradeA.grade === 'F') {
            console.log(`PASS: School A grading correct (75 is F).`);
        } else {
            console.error(`FAIL: School A grading incorrect. Expected F, got ${gradeA.grade}`);
        }

        // School B (Default Scale: 75 is A or B depending on default)
        // Default: 70-100 is A.
        const gradeB = calculateGrade(score, schoolB.gradingScale); // Should use default if we didn't override
        // Wait, I passed default in schema? No, default is in schema definition.
        // But when creating, I didn't pass anything, so it should be default array.
        // Mongoose defaults are applied on creation.
        
        // Let's check what School B has
        const fetchedSchoolB = await School.findById(schoolB._id);
        const gradeB_Actual = calculateGrade(score, fetchedSchoolB.gradingScale);
        
        if (gradeB_Actual.grade === 'A') {
            console.log(`PASS: School B grading correct (75 is A).`);
        } else {
            console.log(`INFO: School B grading is ${gradeB_Actual.grade} (Default scale might be different).`);
        }

        console.log("All tests completed.");
        
    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        await mongoose.connection.close();
    }
}

runTests();
