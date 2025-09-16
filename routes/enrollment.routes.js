// import express from "express";
// import { authenticate, authorize } from "../middleware/auth.js";
// import * as enrollmentController from "../controllers/enrollmentController.js";

// const router = express.Router();

// // Student actions
// router.post("/", authenticate, authorize(["STUDENT"]), enrollmentController.requestEnrollment);
// router.patch("/:id/withdraw", authenticate, authorize(["STUDENT"]), enrollmentController.withdrawEnrollment);

// // Admin actions
// router.patch("/:id/approve", authenticate, authorize(["ADMIN"]), enrollmentController.approveEnrollment);
// router.patch("/:id/reject", authenticate, authorize(["ADMIN"]), enrollmentController.rejectEnrollment);

// export default router;
