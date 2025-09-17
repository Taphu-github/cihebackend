
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClient();

export default class TimeSlotService {
  /**
   * Get all time slots
   * @param {boolean} includeInactive - Include inactive time slots
   * @returns {Promise<Array>} Time slots
   */
  static async getAllTimeSlots(includeInactive = false) {
    try {
      const where = includeInactive ? {} : { isActive: true };

      const timeSlots = await prisma.timeSlot.findMany({
        where,
        orderBy: { startTime: 'asc' },
        include: {
          _count: {
            select: {
              schedules: {
                where: { isActive: true }
              }
            }
          }
        }
      });

      return timeSlots;
    } catch (error) {
      throw new AppError('Failed to fetch time slots', 500);
    }
  }

  /**
   * Get time slot by ID
   * @param {number} id - Time slot ID
   * @returns {Promise<Object>} Time slot details
   */
  static async getTimeSlotById(id) {
    try {
      const timeSlot = await prisma.timeSlot.findUnique({
        where: { id: parseInt(id) },
        include: {
          schedules: {
            where: { isActive: true },
            include: {
              unit: true,
              day: true,
              _count: {
                select: {
                  enrollments: {
                    where: { status: 'APPROVED' }
                  }
                }
              }
            }
          }
        }
      });

      if (!timeSlot) {
        throw new AppError('Time slot not found', 404);
      }

      return timeSlot;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch time slot', 500);
    }
  }

  /**
   * Create new time slot
   * @param {Object} data - Time slot data
   * @returns {Promise<Object>} Created time slot
   */
  static async createTimeSlot(data) {
    try {
      const { name, startTime, endTime } = data;

      // Validate time format and logic
      const start = new Date(startTime);
      const end = new Date(endTime);

      if (start >= end) {
        throw new AppError('End time must be after start time', 400);
      }

      // Check for overlapping time slots
      const overlapping = await this.checkTimeSlotOverlap(start, end);
      if (overlapping.length > 0) {
        throw new AppError('Time slot overlaps with existing time slot', 409);
      }

      const timeSlot = await prisma.timeSlot.create({
        data: {
          name,
          startTime: start,
          endTime: end
        }
      });

      return timeSlot;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create time slot', 500);
    }
  }

  /**
   * Update time slot
   * @param {number} id - Time slot ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated time slot
   */
  static async updateTimeSlot(id, data) {
    try {
      const timeSlot = await prisma.timeSlot.findUnique({
        where: { id: parseInt(id) }
      });

      if (!timeSlot) {
        throw new AppError('Time slot not found', 404);
      }

      const updateData = {};
      
      if (data.name) {
        updateData.name = data.name;
      }

      if (data.startTime || data.endTime) {
        const start = data.startTime ? new Date(data.startTime) : timeSlot.startTime;
        const end = data.endTime ? new Date(data.endTime) : timeSlot.endTime;

        if (start >= end) {
          throw new AppError('End time must be after start time', 400);
        }

        // Check for overlapping time slots (excluding current one)
        const overlapping = await this.checkTimeSlotOverlap(start, end, parseInt(id));
        if (overlapping.length > 0) {
          throw new AppError('Time slot overlaps with existing time slot', 409);
        }

        updateData.startTime = start;
        updateData.endTime = end;
      }

      const updatedTimeSlot = await prisma.timeSlot.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      return updatedTimeSlot;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update time slot', 500);
    }
  }

  /**
   * Delete time slot
   * @param {number} id - Time slot ID
   * @returns {Promise<void>}
   */
  static async deleteTimeSlot(id) {
    try {
      const timeSlot = await prisma.timeSlot.findUnique({
        where: { id: parseInt(id) },
        include: {
          schedules: {
            where: { isActive: true }
          }
        }
      });

      if (!timeSlot) {
        throw new AppError('Time slot not found', 404);
      }

      // Check if time slot is being used in active schedules
      if (timeSlot.schedules.length > 0) {
        throw new AppError('Cannot delete time slot with active schedules', 400);
      }

      await prisma.timeSlot.delete({
        where: { id: parseInt(id) }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete time slot', 500);
    }
  }

  /**
   * Deactivate time slot (soft delete)
   * @param {number} id - Time slot ID
   * @returns {Promise<Object>} Deactivated time slot
   */
  static async deactivateTimeSlot(id) {
    try {
      const timeSlot = await prisma.timeSlot.findUnique({
        where: { id: parseInt(id) },
        include: {
          schedules: {
            where: { isActive: true },
            include: {
              enrollments: {
                where: { status: { in: ['PENDING', 'APPROVED', 'WAITLISTED'] } }
              }
            }
          }
        }
      });

      if (!timeSlot) {
        throw new AppError('Time slot not found', 404);
      }

      // Check if time slot has active enrollments
      const hasActiveEnrollments = timeSlot.schedules.some(schedule => 
        schedule.enrollments.length > 0
      );

      if (hasActiveEnrollments) {
        throw new AppError('Cannot deactivate time slot with active enrollments', 400);
      }

      const updatedTimeSlot = await prisma.timeSlot.update({
        where: { id: parseInt(id) },
        data: { isActive: false }
      });

      return updatedTimeSlot;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to deactivate time slot', 500);
    }
  }

  /**
   * Get available time slots (not conflicting with existing schedules)
   * @param {number} dayId - Day ID
   * @param {string} semester - Semester
   * @param {number} academicYear - Academic year
   * @returns {Promise<Array>} Available time slots
   */
  static async getAvailableTimeSlots(dayId, semester, academicYear) {
    try {
      const timeSlots = await prisma.timeSlot.findMany({
        where: { isActive: true },
        include: {
          schedules: {
            where: {
              dayId: parseInt(dayId),
              semester,
              academicYear: parseInt(academicYear),
              isActive: true
            }
          }
        },
        orderBy: { startTime: 'asc' }
      });

      return timeSlots;
    } catch (error) {
      throw new AppError('Failed to fetch available time slots', 500);
    }
  }

  /**
   * Get time slot usage statistics
   * @returns {Promise<Object>} Usage statistics
   */
  static async getTimeSlotStats() {
    try {
      const stats = await prisma.timeSlot.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              schedules: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: { startTime: 'asc' }
      });

      const totalTimeSlots = stats.length;
      const usedTimeSlots = stats.filter(slot => slot._count.schedules > 0).length;
      const utilizationRate = totalTimeSlots > 0 ? Math.round((usedTimeSlots / totalTimeSlots) * 100) : 0;

      return {
        totalTimeSlots,
        usedTimeSlots,
        unusedTimeSlots: totalTimeSlots - usedTimeSlots,
        utilizationRate,
        timeSlots: stats.map(slot => ({
          id: slot.id,
          name: slot.name,
          startTime: slot.startTime,
          endTime: slot.endTime,
          scheduleCount: slot._count.schedules,
          isActive: slot.isActive
        }))
      };
    } catch (error) {
      throw new AppError('Failed to fetch time slot statistics', 500);
    }
  }

  /**
   * Check for time slot overlap
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @param {number} excludeId - ID to exclude from check
   * @returns {Promise<Array>} Overlapping time slots
   */
  static async checkTimeSlotOverlap(startTime, endTime, excludeId = null) {
    try {
      const where = {
        isActive: true,
        OR: [
          // New slot starts during existing slot
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          // New slot ends during existing slot
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          // New slot completely contains existing slot
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          },
          // Existing slot completely contains new slot
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gte: endTime } }
            ]
          }
        ]
      };

      if (excludeId) {
        where.NOT = { id: excludeId };
      }

      const overlapping = await prisma.timeSlot.findMany({
        where,
        select: {
          id: true,
          name: true,
          startTime: true,
          endTime: true
        }
      });

      return overlapping;
    } catch (error) {
      throw new AppError('Failed to check time slot overlap', 500);
    }
  }

  /**
   * Format time slot display
   * @param {Object} timeSlot - Time slot object
   * @returns {string} Formatted time display
   */
  static formatTimeSlotDisplay(timeSlot) {
    const start = new Date(timeSlot.startTime);
    const end = new Date(timeSlot.endTime);
    
    const formatTime = (date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    return `${timeSlot.name} (${formatTime(start)} - ${formatTime(end)})`;
  }
}

