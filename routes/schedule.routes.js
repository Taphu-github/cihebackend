// routes/schedule.routes.js

import express from 'express';
import {ScheduleController} from '../controllers/schedule.controller.js';
import { authMiddleware } from '../middleware/auth';
import { roleMiddleware } from '../middleware/role';


const router = express.Router();

// Public routes (accessible by authenticated students and admins)
router.get('/', authMiddleware, ScheduleController.getAllSchedules);
router.get('/available', authMiddleware, ScheduleController.getAvailableSchedules);
router.get('/check-conflicts', authMiddleware, ScheduleController.checkScheduleConflicts);
router.get('/unit/:unitId', authMiddleware, ScheduleController.getSchedulesByUnit);
router.get('/:id', authMiddleware, ScheduleController.getScheduleById);

// Admin-only routes
router.post('/', 
  authMiddleware, 
  roleMiddleware(['ADMIN']), 
  ScheduleController.createSchedule
);

router.put('/:id', 
  authMiddleware, 
  roleMiddleware(['ADMIN']), 
  ScheduleController.updateSchedule
);

router.delete('/:id', 
  authMiddleware, 
  roleMiddleware(['ADMIN']), 
  ScheduleController.deleteSchedule
);

router.get('/stats/overview', 
  authMiddleware, 
  roleMiddleware(['ADMIN']), 
  ScheduleController.getScheduleStats
);

export default router;