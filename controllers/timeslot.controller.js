// controllers/timeslot.controller.js

import TimeSlotService from '../services/timeslot.service';
import { AppError } from '../utils/errors.js';

export default class TimeSlotController {
  /**
   * Get all time slots
   */
  static async getAllTimeSlots(req, res, next) {
    try {
      const { includeInactive = false } = req.query;
      
      const timeSlots = await TimeSlotService.getAllTimeSlots(
        includeInactive === 'true'
      );

      res.status(200).json({
        success: true,
        message: 'Time slots fetched successfully',
        data: timeSlots
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get time slot by ID
   */
  static async getTimeSlotById(req, res, next) {
    try {
      const { id } = req.params;
      
      const timeSlot = await TimeSlotService.getTimeSlotById(id);

      res.status(200).json({
        success: true,
        message: 'Time slot fetched successfully',
        data: timeSlot
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new time slot
   */
  static async createTimeSlot(req, res, next) {
    try {
      const { name, startTime, endTime } = req.body;

      // Validation
      if (!name || !startTime || !endTime) {
        throw new AppError('Name, start time, and end time are required', 400);
      }

      // Validate time format
      const start = new Date(startTime);
      const end = new Date(endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError('Invalid time format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)', 400);
      }

      const timeSlot = await TimeSlotService.createTimeSlot({
        name,
        startTime,
        endTime
      });

      res.status(201).json({
        success: true,
        message: 'Time slot created successfully',
        data: timeSlot
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update time slot
   */
  static async updateTimeSlot(req, res, next) {
    try {
      const { id } = req.params;
      const { name, startTime, endTime } = req.body;

      const updateData = {};
      
      if (name) updateData.name = name;
      
      if (startTime) {
        const start = new Date(startTime);
        if (isNaN(start.getTime())) {
          throw new AppError('Invalid start time format', 400);
        }
        updateData.startTime = startTime;
      }
      
      if (endTime) {
        const end = new Date(endTime);
        if (isNaN(end.getTime())) {
          throw new AppError('Invalid end time format', 400);
        }
        updateData.endTime = endTime;
      }

      const timeSlot = await TimeSlotService.updateTimeSlot(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Time slot updated successfully',
        data: timeSlot
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete time slot
   */
  static async deleteTimeSlot(req, res, next) {
    try {
      const { id } = req.params;
      
      await TimeSlotService.deleteTimeSlot(id);

      res.status(200).json({
        success: true,
        message: 'Time slot deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate time slot
   */
  static async deactivateTimeSlot(req, res, next) {
    try {
      const { id } = req.params;
      
      const timeSlot = await TimeSlotService.deactivateTimeSlot(id);

      res.status(200).json({
        success: true,
        message: 'Time slot deactivated successfully',
        data: timeSlot
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available time slots
   */
  static async getAvailableTimeSlots(req, res, next) {
    try {
      const { dayId, semester, academicYear } = req.query;

      if (!dayId || !semester || !academicYear) {
        throw new AppError('Day ID, semester, and academic year are required', 400);
      }

      const timeSlots = await TimeSlotService.getAvailableTimeSlots(
        dayId,
        semester,
        academicYear
      );

      res.status(200).json({
        success: true,
        message: 'Available time slots fetched successfully',
        data: timeSlots
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get time slot statistics
   */
  static async getTimeSlotStats(req, res, next) {
    try {
      const stats = await TimeSlotService.getTimeSlotStats();

      res.status(200).json({
        success: true,
        message: 'Time slot statistics fetched successfully',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check time slot overlap
   */
  static async checkTimeSlotOverlap(req, res, next) {
    try {
      const { startTime, endTime, excludeId } = req.query;

      if (!startTime || !endTime) {
        throw new AppError('Start time and end time are required', 400);
      }

      // Validate time format
      const start = new Date(startTime);
      const end = new Date(endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError('Invalid time format', 400);
      }

      if (start >= end) {
        throw new AppError('End time must be after start time', 400);
      }

      const overlaps = await TimeSlotService.checkTimeSlotOverlap(
        start,
        end,
        excludeId ? parseInt(excludeId) : null
      );

      res.status(200).json({
        success: true,
        message: 'Time slot overlap check completed',
        data: {
          hasOverlap: overlaps.length > 0,
          overlappingSlots: overlaps
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

