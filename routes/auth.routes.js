import express from "express";
import AuthController  from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";


const router = express.Router();

// Public
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/forgot-password", AuthController.requestPasswordReset);
router.post("/reset-password", AuthController.resetPassword);

// Protected
router.post("/logout", authenticate, AuthController.logout);
router.post("/change-password", authenticate, AuthController.changePassword);
router.get("/profile", authenticate, AuthController.profile);
router.put("/profile", authenticate, AuthController.updateProfile);

export default router;
