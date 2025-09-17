// routes/unit.routes.js
import express from 'express';
import { UnitController } from '../controllers/unit.controller';
import { authMiddleware } from '../middleware/auth';
import { roleMiddleware } from '../middleware/role';


const router = express.Router();

// Public routes (accessible by authenticated students and admins)
router.get('/', authMiddleware, UnitController.getAllUnits);
router.get('/search', authMiddleware, UnitController.searchUnits);
router.get('/:id', authMiddleware, UnitController.getUnitById);

// Admin-only routes
router.post('/', 
  authMiddleware, 
  roleMiddleware(['ADMIN']), 
  UnitController.createUnit
);

router.put('/:id', 
  authMiddleware, 
  roleMiddleware(['ADMIN']), 
  UnitController.updateUnit
);

router.delete('/:id', 
  authMiddleware, 
  roleMiddleware(['ADMIN']), 
  UnitController.deactivateUnit
);

router.get('/:id/stats', 
  authMiddleware, 
  roleMiddleware(['ADMIN']), 
  UnitController.getUnitStats
);

export default router;