// routes/timeslot.routes.js


import express from 'express';
import { TimeSlotController } from '../controllers/timeslot.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { roleMiddleware } from '../middleware/role.js';

const router = express.Router();

// Public routes (accessible by authenticated students and admins)
router.get('/', authMiddleware, TimeSlotController.getAllTimeSlots);
router.get('/available', authMiddleware, TimeSlotController.getAvailableTimeSlots);
router.get('/check-overlap', authMiddleware, TimeSlotController.checkTimeSlotOverlap);
router.get('/:id', authMiddleware, TimeSlotController.getTimeSlotById);

// Admin-only routes
router.post('/', 
  authMiddleware, 
  roleMiddleware(['ADMIN']), 
  TimeSlotController.createTimeSlot
);

router.put('/:id', 
  authMiddleware, 
  roleMiddleware(['ADMIN']), 
  TimeSlotController.updateTimeSlot
);

router.delete('/:id', 
  authMiddleware, 
  roleMiddleware(['ADMIN']), 
  TimeSlotController.deleteTimeSlot
);

router.put('/:id/deactivate', 
  authMiddleware, 
  roleMiddleware(['ADMIN']), 
  TimeSlotController.deactivateTimeSlot
);

router.get('/stats/usage', 
  authMiddleware, 
  roleMiddleware(['ADMIN']), 
  TimeSlotController.getTimeSlotStats
);

export default router;