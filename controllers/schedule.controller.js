

import ScheduleService from "../services/schedule.service.js";
import { AppError } from "../utils/errors.js";

class ScheduleController {
  /**
   * Get all schedules
   */
  static async getAllSchedules(req, res, next) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        unitId, 
        dayId, 
        timeSlotId, 
        semester, 
        academicYear, 
        location, 
        tutorName 
      } = req.query;
      
      const filters = {
        unitId,
        dayId,
        timeSlotId,
        semester,
        academicYear,
        location,
        tutorName
      };

      const result = await ScheduleService.getAllSchedules(
        filters, 
        parseInt(page), 
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        message: 'Schedules fetched successfully',
        data: result.schedules,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get schedule by ID
   */
  static async getScheduleById(req, res, next) {
    try {
      const { id } = req.params;
      
      const schedule = await ScheduleService.getScheduleById(id);

      res.status(200).json({
        success: true,
        message: 'Schedule fetched successfully',
        data: schedule
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new schedule
   */
  static async createSchedule(req, res, next) {
    try {
      const { 
        unitId, 
        timeSlotId, 
        dayId, 
        tutorName, 
        location, 
        semester, 
        academicYear, 
        maxCapacity 
      } = req.body;

      // Validation
      if (!unitId || !timeSlotId || !dayId || !semester || !academicYear) {
        throw new AppError('Unit ID, time slot ID, day ID, semester, and academic year are required', 400);
      }

      if (maxCapacity && parseInt(maxCapacity) <= 0) {
        throw new AppError('Max capacity must be a positive number', 400);
      }

      const schedule = await ScheduleService.createSchedule({
        unitId,
        timeSlotId,
        dayId,
        tutorName,
        location,
        semester,
        academicYear,
        maxCapacity
      });

      res.status(201).json({
        success: true,
        message: 'Schedule created successfully',
        data: schedule
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update schedule
   */
  static async updateSchedule(req, res, next) {
    try {
      const { id } = req.params;
      const { tutorName, location, maxCapacity, timeSlotId, dayId } = req.body;

      const updateData = {};
      
      if (tutorName !== undefined) updateData.tutorName = tutorName;
      if (location !== undefined) updateData.location = location;
      if (timeSlotId) updateData.timeSlotId = timeSlotId;
      if (dayId) updateData.dayId = dayId;
      
      if (maxCapacity !== undefined) {
        if (maxCapacity && parseInt(maxCapacity) <= 0) {
          throw new AppError('Max capacity must be a positive number', 400);
        }
        updateData.maxCapacity = maxCapacity;
      }

      const schedule = await ScheduleService.updateSchedule(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Schedule updated successfully',
        data: schedule
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete schedule
   */
  static async deleteSchedule(req, res, next) {
    try {
      const { id } = req.params;
      
      await ScheduleService.deleteSchedule(id);

      res.status(200).json({
        success: true,
        message: 'Schedule deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get schedules for a specific unit
   */
  static async getSchedulesByUnit(req, res, next) {
    try {
      const { unitId } = req.params;
      const { semester, academicYear } = req.query;
      
      const filters = { semester, academicYear };
      const schedules = await ScheduleService.getSchedulesByUnit(unitId, filters);

      res.status(200).json({
        success: true,
        message: 'Unit schedules fetched successfully',
        data: schedules
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check schedule conflicts
   */
  static async checkScheduleConflicts(req, res, next) {
    try {
      const { timeSlotId, dayId, semester, academicYear, excludeId } = req.query;

      if (!timeSlotId || !dayId || !semester || !academicYear) {
        throw new AppError('Time slot ID, day ID, semester, and academic year are required', 400);
      }

      try {
        await ScheduleService.checkScheduleConflicts(
          timeSlotId,
          dayId,
          semester,
          academicYear,
          excludeId ? parseInt(excludeId) : null
        );

        res.status(200).json({
          success: true,
          message: 'No schedule conflicts found',
          data: { hasConflict: false }
        });

      } catch (error) {
        if (error instanceof AppError && error.statusCode === 409) {
          res.status(200).json({
            success: true,
            message: 'Schedule conflict detected',
            data: { 
              hasConflict: true, 
              conflictMessage: error.message 
            }
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available schedules for enrollment
   */
  static async getAvailableSchedules(req, res, next) {
    try {
      const { semester, academicYear, unitId, program } = req.query;
      
      const filters = { semester, academicYear, unitId, program };
      const schedules = await ScheduleService.getAvailableSchedules(filters);

      res.status(200).json({
        success: true,
        message: 'Available schedules fetched successfully',
        data: schedules
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get schedule statistics
   */
  static async getScheduleStats(req, res, next) {
    try {
      const { semester, academicYear } = req.query;
      
      const filters = { semester, academicYear };
      const stats = await ScheduleService.getScheduleStats(filters);

      res.status(200).json({
        success: true,
        message: 'Schedule statistics fetched successfully',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

export default { ScheduleController };