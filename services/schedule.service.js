// services/schedule.service.js


import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClient();

class ScheduleService {
  /**
   * Get all schedules with filters
   * @param {Object} filters - Filter options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Schedules with pagination
   */
  static async getAllSchedules(filters = {}, page = 1, limit = 20) {
    try {
      const where = {
        isActive: true,
        ...(filters.unitId && { unitId: parseInt(filters.unitId) }),
        ...(filters.dayId && { dayId: parseInt(filters.dayId) }),
        ...(filters.timeSlotId && { timeSlotId: parseInt(filters.timeSlotId) }),
        ...(filters.semester && { semester: filters.semester }),
        ...(filters.academicYear && { academicYear: parseInt(filters.academicYear) }),
        ...(filters.location && { 
          location: { contains: filters.location, mode: 'insensitive' } 
        }),
        ...(filters.tutorName && { 
          tutorName: { contains: filters.tutorName, mode: 'insensitive' } 
        })
      };

      const skip = (page - 1) * limit;
      
      const [schedules, totalCount] = await Promise.all([
        prisma.schedule.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { unit: { unitCode: 'asc' } },
            { day: { dayOrder: 'asc' } },
            { timeSlot: { startTime: 'asc' } }
          ],
          include: {
            unit: true,
            timeSlot: true,
            day: true,
            _count: {
              select: {
                enrollments: {
                  where: { status: 'APPROVED' }
                }
              }
            }
          }
        }),
        prisma.schedule.count({ where })
      ]);

      // Add enrollment statistics to each schedule
      const schedulesWithStats = schedules.map(schedule => ({
        ...schedule,
        enrollmentStats: {
          approvedEnrollments: schedule._count.enrollments,
          availableSpots: (schedule.maxCapacity || schedule.unit.capacity) - schedule._count.enrollments,
          capacity: schedule.maxCapacity || schedule.unit.capacity,
          utilizationRate: Math.round((schedule._count.enrollments / (schedule.maxCapacity || schedule.unit.capacity)) * 100)
        }
      }));

      return {
        schedules: schedulesWithStats,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new AppError('Failed to fetch schedules', 500);
    }
  }

  /**
   * Get schedule by ID
   * @param {number} id - Schedule ID
   * @returns {Promise<Object>} Schedule details
   */
  static async getScheduleById(id) {
    try {
      const schedule = await prisma.schedule.findUnique({
        where: { id: parseInt(id) },
        include: {
          unit: true,
          timeSlot: true,
          day: true,
          enrollments: {
            include: {
              studentProfile: {
                select: {
                  id: true,
                  studentId: true,
                  firstName: true,
                  lastName: true,
                  program: true,
                  yearLevel: true
                }
              }
            },
            orderBy: { enrolledAt: 'asc' }
          }
        }
      });

      if (!schedule) {
        throw new AppError('Schedule not found', 404);
      }

      // Add enrollment statistics
      const enrollmentStats = {
        total: schedule.enrollments.length,
        approved: schedule.enrollments.filter(e => e.status === 'APPROVED').length,
        pending: schedule.enrollments.filter(e => e.status === 'PENDING').length,
        waitlisted: schedule.enrollments.filter(e => e.status === 'WAITLISTED').length,
        rejected: schedule.enrollments.filter(e => e.status === 'REJECTED').length,
        withdrawn: schedule.enrollments.filter(e => e.status === 'WITHDRAWN').length
      };

      const capacity = schedule.maxCapacity || schedule.unit.capacity;
      enrollmentStats.availableSpots = capacity - enrollmentStats.approved;
      enrollmentStats.utilizationRate = Math.round((enrollmentStats.approved / capacity) * 100);

      return {
        ...schedule,
        enrollmentStats
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch schedule', 500);
    }
  }

  /**
   * Create new schedule
   * @param {Object} data - Schedule data
   * @returns {Promise<Object>} Created schedule
   */
  static async createSchedule(data) {
    try {
      const { unitId, timeSlotId, dayId, tutorName, location, semester, academicYear, maxCapacity } = data;

      // Validate required fields
      if (!unitId || !timeSlotId || !dayId || !semester || !academicYear) {
        throw new AppError('Missing required fields', 400);
      }

      // Check if unit exists and is active
      const unit = await prisma.unit.findUnique({
        where: { id: parseInt(unitId), isActive: true }
      });

      if (!unit) {
        throw new AppError('Unit not found or inactive', 404);
      }

      // Check if time slot exists and is active
      const timeSlot = await prisma.timeSlot.findUnique({
        where: { id: parseInt(timeSlotId), isActive: true }
      });

      if (!timeSlot) {
        throw new AppError('Time slot not found or inactive', 404);
      }

      // Check if day exists
      const day = await prisma.day.findUnique({
        where: { id: parseInt(dayId) }
      });

      if (!day) {
        throw new AppError('Day not found', 404);
      }

      // Check for duplicate schedule
      const existingSchedule = await prisma.schedule.findFirst({
        where: {
          unitId: parseInt(unitId),
          timeSlotId: parseInt(timeSlotId),
          dayId: parseInt(dayId),
          semester,
          academicYear: parseInt(academicYear),
          isActive: true
        }
      });

      if (existingSchedule) {
        throw new AppError('Schedule already exists for this combination', 409);
      }

      // Check for time conflicts on the same day
      await this.checkScheduleConflicts(parseInt(timeSlotId), parseInt(dayId), semester, parseInt(academicYear));

      const schedule = await prisma.schedule.create({
        data: {
          unitId: parseInt(unitId),
          timeSlotId: parseInt(timeSlotId),
          dayId: parseInt(dayId),
          tutorName: tutorName || null,
          location: location || null,
          semester,
          academicYear: parseInt(academicYear),
          maxCapacity: maxCapacity ? parseInt(maxCapacity) : null
        },
        include: {
          unit: true,
          timeSlot: true,
          day: true
        }
      });

      return schedule;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create schedule', 500);
    }
  }

  /**
   * Update schedule
   * @param {number} id - Schedule ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated schedule
   */
  static async updateSchedule(id, data) {
    try {
      const schedule = await prisma.schedule.findUnique({
        where: { id: parseInt(id) },
        include: { enrollments: { where: { status: { in: ['PENDING', 'APPROVED', 'WAITLISTED'] } } } }
      });

      if (!schedule) {
        throw new AppError('Schedule not found', 404);
      }

      // Check if schedule has active enrollments for certain updates
      const hasActiveEnrollments = schedule.enrollments.length > 0;

      if (hasActiveEnrollments && (data.timeSlotId || data.dayId)) {
        throw new AppError('Cannot change time or day for schedule with active enrollments', 400);
      }

      const updateData = {};

      if (data.tutorName !== undefined) updateData.tutorName = data.tutorName;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.maxCapacity !== undefined) {
        const newCapacity = parseInt(data.maxCapacity);
        const approvedEnrollments = schedule.enrollments.filter(e => e.status === 'APPROVED').length;
        
        if (newCapacity < approvedEnrollments) {
          throw new AppError(`Cannot set capacity below current approved enrollments (${approvedEnrollments})`, 400);
        }
        updateData.maxCapacity = newCapacity;
      }

      // Handle time slot and day updates (only if no active enrollments)
      if (data.timeSlotId && !hasActiveEnrollments) {
        const timeSlot = await prisma.timeSlot.findUnique({
          where: { id: parseInt(data.timeSlotId), isActive: true }
        });
        
        if (!timeSlot) {
          throw new AppError('Time slot not found or inactive', 404);
        }
        
        updateData.timeSlotId = parseInt(data.timeSlotId);
      }

      if (data.dayId && !hasActiveEnrollments) {
        const day = await prisma.day.findUnique({
          where: { id: parseInt(data.dayId) }
        });
        
        if (!day) {
          throw new AppError('Day not found', 404);
        }
        
        updateData.dayId = parseInt(data.dayId);
      }

      // Check for conflicts if time or day is being updated
      if (updateData.timeSlotId || updateData.dayId) {
        const checkTimeSlotId = updateData.timeSlotId || schedule.timeSlotId;
        const checkDayId = updateData.dayId || schedule.dayId;
        
        await this.checkScheduleConflicts(
          checkTimeSlotId, 
          checkDayId, 
          schedule.semester, 
          schedule.academicYear,
          parseInt(id)
        );
      }

      const updatedSchedule = await prisma.schedule.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          unit: true,
          timeSlot: true,
          day: true
        }
      });

      return updatedSchedule;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update schedule', 500);
    }
  }

  /**
   * Delete schedule
   * @param {number} id - Schedule ID
   * @returns {Promise<void>}
   */
  static async deleteSchedule(id) {
    try {
      const schedule = await prisma.schedule.findUnique({
        where: { id: parseInt(id) },
        include: {
          enrollments: {
            where: { status: { in: ['PENDING', 'APPROVED', 'WAITLISTED'] } }
          }
        }
      });

      if (!schedule) {
        throw new AppError('Schedule not found', 404);
      }

      if (schedule.enrollments.length > 0) {
        throw new AppError('Cannot delete schedule with active enrollments', 400);
      }

      await prisma.schedule.update({
        where: { id: parseInt(id) },
        data: { isActive: false }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete schedule', 500);
    }
  }

  /**
   * Get schedules for a specific unit
   * @param {number} unitId - Unit ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Unit schedules
   */
  static async getSchedulesByUnit(unitId, filters = {}) {
    try {
      const where = {
        unitId: parseInt(unitId),
        isActive: true,
        ...(filters.semester && { semester: filters.semester }),
        ...(filters.academicYear && { academicYear: parseInt(filters.academicYear) })
      };

      const schedules = await prisma.schedule.findMany({
        where,
        include: {
          timeSlot: true,
          day: true,
          _count: {
            select: {
              enrollments: {
                where: { status: 'APPROVED' }
              }
            }
          }
        },
        orderBy: [
          { day: { dayOrder: 'asc' } },
          { timeSlot: { startTime: 'asc' } }
        ]
      });

      return schedules;
    } catch (error) {
      throw new AppError('Failed to fetch unit schedules', 500);
    }
  }

  /**
   * Check for schedule conflicts
   * @param {number} timeSlotId - Time slot ID
   * @param {number} dayId - Day ID
   * @param {string} semester - Semester
   * @param {number} academicYear - Academic year
   * @param {number} excludeId - Schedule ID to exclude
   * @returns {Promise<void>}
   */
  static async checkScheduleConflicts(timeSlotId, dayId, semester, academicYear, excludeId = null) {
    try {
      const where = {
        timeSlotId: parseInt(timeSlotId),
        dayId: parseInt(dayId),
        semester,
        academicYear: parseInt(academicYear),
        isActive: true
      };

      if (excludeId) {
        where.NOT = { id: excludeId };
      }

      const conflicts = await prisma.schedule.findMany({
        where,
        include: {
          unit: true,
          timeSlot: true,
          day: true
        }
      });

      if (conflicts.length > 0) {
        const conflictDetails = conflicts.map(c => 
          `${c.unit.unitCode} on ${c.day.name} at ${c.timeSlot.name}`
        ).join(', ');
        
        throw new AppError(`Schedule conflicts with existing schedules: ${conflictDetails}`, 409);
      }

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to check schedule conflicts', 500);
    }
  }

  /**
   * Get available schedules for enrollment
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Available schedules
   */
  static async getAvailableSchedules(filters = {}) {
    try {
      const where = {
        isActive: true,
        ...(filters.semester && { semester: filters.semester }),
        ...(filters.academicYear && { academicYear: parseInt(filters.academicYear) }),
        ...(filters.unitId && { unitId: parseInt(filters.unitId) }),
        ...(filters.program && { 
          unit: { 
            OR: [
              { title: { contains: filters.program, mode: 'insensitive' } },
              { description: { contains: filters.program, mode: 'insensitive' } }
            ]
          }
        })
      };

      const schedules = await prisma.schedule.findMany({
        where,
        include: {
          unit: true,
          timeSlot: true,
          day: true,
          _count: {
            select: {
              enrollments: {
                where: { status: 'APPROVED' }
              }
            }
          }
        },
        orderBy: [
          { unit: { unitCode: 'asc' } },
          { day: { dayOrder: 'asc' } },
          { timeSlot: { startTime: 'asc' } }
        ]
      });

      // Filter schedules with available spots
      const availableSchedules = schedules.filter(schedule => {
        const capacity = schedule.maxCapacity || schedule.unit.capacity;
        const enrolledCount = schedule._count.enrollments;
        return enrolledCount < capacity;
      }).map(schedule => ({
        ...schedule,
        availableSpots: (schedule.maxCapacity || schedule.unit.capacity) - schedule._count.enrollments,
        capacity: schedule.maxCapacity || schedule.unit.capacity,
        enrolledCount: schedule._count.enrollments
      }));

      return availableSchedules;
    } catch (error) {
      throw new AppError('Failed to fetch available schedules', 500);
    }
  }

  /**
   * Get schedule statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Schedule statistics
   */
  static async getScheduleStats(filters = {}) {
    try {
      const where = {
        isActive: true,
        ...(filters.semester && { semester: filters.semester }),
        ...(filters.academicYear && { academicYear: parseInt(filters.academicYear) })
      };

      const schedules = await prisma.schedule.findMany({
        where,
        include: {
          unit: true,
          _count: {
            select: {
              enrollments: {
                where: { status: 'APPROVED' }
              }
            }
          }
        }
      });

      const stats = {
        totalSchedules: schedules.length,
        totalCapacity: 0,
        totalEnrollments: 0,
        availableSpots: 0,
        fullSchedules: 0,
        emptySchedules: 0,
        utilizationRate: 0
      };

      schedules.forEach(schedule => {
        const capacity = schedule.maxCapacity || schedule.unit.capacity;
        const enrolled = schedule._count.enrollments;
        
        stats.totalCapacity += capacity;
        stats.totalEnrollments += enrolled;
        stats.availableSpots += (capacity - enrolled);
        
        if (enrolled >= capacity) stats.fullSchedules++;
        if (enrolled === 0) stats.emptySchedules++;
      });

      stats.utilizationRate = stats.totalCapacity > 0 
        ? Math.round((stats.totalEnrollments / stats.totalCapacity) * 100)
        : 0;

      return stats;
    } catch (error) {
      throw new AppError('Failed to fetch schedule statistics', 500);
    }
  }
}

export default { ScheduleService };