// import prisma from "../prisma/client.js";

// export async function requestEnrollment(userId, scheduleId) {
//   return prisma.enrollment.create({
//     data: {
//       userId,
//       scheduleId,
//       status: "PENDING"
//     }
//   });
// }

// export async function withdrawEnrollment(userId, enrollmentId) {
//   const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
//   if (!enrollment || enrollment.userId !== userId) {
//     throw new Error("Not authorized to withdraw this enrollment");
//   }
//   return prisma.enrollment.update({
//     where: { id: enrollmentId },
//     data: { status: "WITHDRAWN" }
//   });
// }

// export async function approveEnrollment(enrollmentId) {
//   return prisma.enrollment.update({
//     where: { id: enrollmentId },
//     data: { status: "APPROVED" }
//   });
// }

// export async function rejectEnrollment(enrollmentId) {
//   return prisma.enrollment.update({
//     where: { id: enrollmentId },
//     data: { status: "REJECTED" }
//   });
// }
