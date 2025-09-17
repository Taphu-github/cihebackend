// controllers/unit.controller.js
import UnitService from '../services/unit.service';
import { AppError } from '../utils/errors';

export default class UnitController {
  /**
   * Get all units
   */
  static async getAllUnits(req, res, next) {
    try {
      const { page = 1, limit = 10, search, credits, minCredits, maxCredits } = req.query;
      
      const filters = {
        search,
        credits,
        minCredits,
        maxCredits
      };

      const result = await UnitService.getAllUnits(
        filters, 
        parseInt(page), 
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        message: 'Units fetched successfully',
        data: result.units,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unit by ID
   */
  static async getUnitById(req, res, next) {
    try {
      const { id } = req.params;
      
      const unit = await UnitService.getUnitById(id);

      res.status(200).json({
        success: true,
        message: 'Unit fetched successfully',
        data: unit
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new unit
   */
  static async createUnit(req, res, next) {
    try {
      const { unitCode, title, description, credits, capacity } = req.body;

      // Validation
      if (!unitCode || !title || !credits || !capacity) {
        throw new AppError('Unit code, title, credits, and capacity are required', 400);
      }

      if (parseInt(credits) <= 0) {
        throw new AppError('Credits must be a positive number', 400);
      }

      if (parseInt(capacity) <= 0) {
        throw new AppError('Capacity must be a positive number', 400);
      }

      const unit = await UnitService.createUnit({
        unitCode,
        title,
        description,
        credits,
        capacity
      });

      res.status(201).json({
        success: true,
        message: 'Unit created successfully',
        data: unit
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update unit
   */
  static async updateUnit(req, res, next) {
    try {
      const { id } = req.params;
      const { unitCode, title, description, credits, capacity } = req.body;

      // Validation for numerical fields
      const updateData = {};
      
      if (unitCode) updateData.unitCode = unitCode;
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      
      if (credits) {
        if (parseInt(credits) <= 0) {
          throw new AppError('Credits must be a positive number', 400);
        }
        updateData.credits = credits;
      }
      
      if (capacity) {
        if (parseInt(capacity) <= 0) {
          throw new AppError('Capacity must be a positive number', 400);
        }
        updateData.capacity = capacity;
      }

      const unit = await UnitService.updateUnit(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Unit updated successfully',
        data: unit
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate unit
   */
  static async deactivateUnit(req, res, next) {
    try {
      const { id } = req.params;
      
      const unit = await UnitService.deactivateUnit(id);

      res.status(200).json({
        success: true,
        message: 'Unit deactivated successfully',
        data: unit
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search units
   */
  static async searchUnits(req, res, next) {
    try {
      const { q: query, limit = 20 } = req.query;

      if (!query) {
        throw new AppError('Search query is required', 400);
      }

      const units = await UnitService.searchUnits(query, parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Units search completed',
        data: units
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unit statistics
   */
  static async getUnitStats(req, res, next) {
    try {
      const { id } = req.params;
      
      const result = await UnitService.getUnitStats(id);

      res.status(200).json({
        success: true,
        message: 'Unit statistics fetched successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

