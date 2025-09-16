// import * as enrollmentService from "../services/enrollmentService.js";

// export async function requestEnrollment(req, res) {
//   try {
//     const result = await enrollmentService.requestEnrollment(req.user.id, req.body.scheduleId);
//     res.json(result);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// }

// export async function withdrawEnrollment(req, res) {
//   try {
//     const result = await enrollmentService.withdrawEnrollment(req.user.id, parseInt(req.params.id));
//     res.json(result);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// }

// export async function approveEnrollment(req, res) {
//   try {
//     const result = await enrollmentService.approveEnrollment(parseInt(req.params.id));
//     res.json(result);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// }

// export async function rejectEnrollment(req, res) {
//   try {
//     const result = await enrollmentService.rejectEnrollment(parseInt(req.params.id));
//     res.json(result);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// }
