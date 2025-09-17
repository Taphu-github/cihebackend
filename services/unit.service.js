// services/unit.service.js
import { PrismaClient } from '@prisma/client';
import {AppError} from '../utils/errors.js';

const prisma = new PrismaClient();

export default class UnitService {

  static async getAllUnits(filters = {}, page = 1, limit = 10) {
    try {
      const where = {
        isActive: true,
        ...(filters.search && {
          OR: [
            { unitCode: { contains: filters.search, mode: 'insensitive' } },
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } }
          ]
        }),
        ...(filters.credits && { credits: parseInt(filters.credits) }),
        ...(filters.minCredits && { credits: { gte: parseInt(filters.minCredits) } }),
        ...(filters.maxCredits && { credits: { lte: parseInt(filters.maxCredits) } })
      };

      const skip = (page - 1) * limit;
      
      const [units, totalCount] = await Promise.all([
        prisma.unit.findMany({
          where,
          skip,
          take: limit,
          orderBy: { unitCode: 'asc' },
          include: {
            schedules: {
              where: { isActive: true },
              include: {
                timeSlot: true,
                day: true,
                _count: {
                  select: { enrollments: true }
                }
              }
            }
          }
        }),
        prisma.unit.count({ where })
      ]);

      return {
        units,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new AppError('Failed to fetch units', 500);
    }
  }

  
  static async getUnitById(id) {
    try {
      const unit = await prisma.unit.findUnique({
        where: { id: parseInt(id) },
        include: {
          schedules: {
            where: { isActive: true },
            include: {
              timeSlot: true,
              day: true,
              enrollments: {
                where: { status: 'APPROVED' }
              },
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

      if (!unit) {
        throw new AppError('Unit not found', 404);
      }

      return unit;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch unit', 500);
    }
  }


  static async createUnit(data) {
    try {
      const { unitCode, title, description, credits, capacity } = data;

      // Check if unit code already exists
      const existingUnit = await prisma.unit.findUnique({
        where: { unitCode }
      });

      if (existingUnit) {
        throw new AppError('Unit code already exists', 409);
      }

      const unit = await prisma.unit.create({
        data: {
          unitCode: unitCode.toUpperCase(),
          title,
          description: description || null,
          credits: parseInt(credits),
          capacity: parseInt(capacity)
        }
      });

      return unit;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create unit', 500);
    }
  }


  static async updateUnit(id, data) {
    try {
      const unit = await prisma.unit.findUnique({
        where: { id: parseInt(id) }
      });

      if (!unit) {
        throw new AppError('Unit not found', 404);
      }

      // Check if new unit code already exists (if being updated)
      if (data.unitCode && data.unitCode !== unit.unitCode) {
        const existingUnit = await prisma.unit.findUnique({
          where: { unitCode: data.unitCode.toUpperCase() }
        });

        if (existingUnit) {
          throw new AppError('Unit code already exists', 409);
        }
      }

      const updatedUnit = await prisma.unit.update({
        where: { id: parseInt(id) },
        data: {
          ...(data.unitCode && { unitCode: data.unitCode.toUpperCase() }),
          ...(data.title && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.credits && { credits: parseInt(data.credits) }),
          ...(data.capacity && { capacity: parseInt(data.capacity) })
        }
      });

      return updatedUnit;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update unit', 500);
    }
  }


  static async deactivateUnit(id) {
    try {
      const unit = await prisma.unit.findUnique({
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

      if (!unit) {
        throw new AppError('Unit not found', 404);
      }

      // Check if unit has active enrollments
      const hasActiveEnrollments = unit.schedules.some(schedule => 
        schedule.enrollments.length > 0
      );

      if (hasActiveEnrollments) {
        throw new AppError('Cannot deactivate unit with active enrollments', 400);
      }

      const updatedUnit = await prisma.unit.update({
        where: { id: parseInt(id) },
        data: { isActive: false }
      });

      return updatedUnit;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to deactivate unit', 500);
    }
  }


  static async searchUnits(query, limit = 20) {
    try {
      const units = await prisma.unit.findMany({
        where: {
          isActive: true,
          OR: [
            { unitCode: { contains: query, mode: 'insensitive' } },
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: limit,
        orderBy: [
          { unitCode: 'asc' },
          { title: 'asc' }
        ],
        select: {
          id: true,
          unitCode: true,
          title: true,
          credits: true,
          capacity: true
        }
      });

      return units;
    } catch (error) {
      throw new AppError('Search failed', 500);
    }
  }


  static async getUnitStats(id) {
    try {
      const unit = await prisma.unit.findUnique({
        where: { id: parseInt(id) },
        include: {
          schedules: {
            where: { isActive: true },
            include: {
              enrollments: true,
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

      if (!unit) {
        throw new AppError('Unit not found', 404);
      }

      const stats = {
        totalSchedules: unit.schedules.length,
        totalEnrollments: 0,
        approvedEnrollments: 0,
        pendingEnrollments: 0,
        waitlistedEnrollments: 0,
        rejectedEnrollments: 0,
        totalCapacity: 0,
        utilizationRate: 0
      };

      unit.schedules.forEach(schedule => {
        stats.totalCapacity += schedule.maxCapacity || unit.capacity;
        
        schedule.enrollments.forEach(enrollment => {
          stats.totalEnrollments++;
          switch (enrollment.status) {
            case 'APPROVED':
              stats.approvedEnrollments++;
              break;
            case 'PENDING':
              stats.pendingEnrollments++;
              break;
            case 'WAITLISTED':
              stats.waitlistedEnrollments++;
              break;
            case 'REJECTED':
              stats.rejectedEnrollments++;
              break;
          }
        });
      });

      stats.utilizationRate = stats.totalCapacity > 0 
        ? Math.round((stats.approvedEnrollments / stats.totalCapacity) * 100)
        : 0;

      return { unit, stats };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch unit statistics', 500);
    }
  }
}

