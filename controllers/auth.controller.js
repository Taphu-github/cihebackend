
import {AuthService} from "../services/auth.service.js";
import { AppError } from "../utils/errors.js";


export default class AuthController {
  static async register(req, res, next) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const result = await AuthService.login(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async logout(req, res, next) {
    try {
      await AuthService.logout(req.user.userId);
      res.json({ message: "Logged out successfully" });
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.user.userId, currentPassword, newPassword);
      res.json({ message: "Password changed successfully" });
    } catch (err) {
      next(err);
    }
  }

  static async profile(req, res, next) {
    try {
      const profile = await AuthService.getUserProfile(req.user.userId);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const profile = await AuthService.updateProfile(req.user.userId, req.body);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }

  // Forgot password step 1: request reset
  static async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;
      await AuthService.requestPasswordReset(email);
      res.json({ message: "Password reset OTP sent to your email" });
    } catch (err) {
      next(err);
    }
  }

  // Forgot password step 2: verify OTP & reset
  static async resetPassword(req, res, next) {
    try {
      const { email, otp, newPassword } = req.body;
      await AuthService.resetPassword(email, otp, newPassword);
      res.json({ message: "Password reset successfully" });
    } catch (err) {
      next(err);
    }
  }
}

