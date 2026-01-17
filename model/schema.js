// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;
//
// //class Schema
// const classSchema = new Schema(
//   {
//     cname: {
//       type: String,
//       unique: true,
//       required: true,
//     },
//     cnameNum: {
//       type: Number,
//       unique: true,
//       required: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );
//
// //Subject Schema
// const subjectSchema = new Schema(
//   {
//     sname: {
//       type: String,
//       unique: true,
//       required: true,
//     },
//     scode: {
//       type: String,
//       unique: true,
//       required: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );
//
// //Student Schema
// const studentSchema = new Schema(
//   {
//     fname: {
//       type: String,
//       unique: true,
//       required: true,
//     },
//     rollId: {
//       type: String,
//       unique: true,
//       required: true,
//     },
//     email: {
//       type: String,
//     },
//     gender: {
//       type: String,
//       required: true,
//     },
//     sclass: {
//       type: String,
//       required: true,
//     },
//     dob: {
//       type: Date,
//       required: true,
//     },
//     phone_no: {
//       type: String,
//     },
//     address: {
//       type: String,
//     },
//     result: [
//       {
//         subject: {
//           type: String,
//           required: true,
//         },
//         score: {
//           type: Number,
//           required: true,
//         },
//         grade: {
//           type: String,
//           required: true,
//         },
//       },
//     ],
//   },
//   {
//     timestamps: true,
//   }
// );
//
// const ClassModel = mongoose.model("classes", classSchema);
// const Subjects = mongoose.model("subjects", subjectSchema);
// const Students = mongoose.model("students", studentSchema);
//
// module.exports = {
//   ClassModel,
//   Subjects,
//   Students,
// };
