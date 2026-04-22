import express from "express";
import { checkAuthenticated, getAllUsers, logout, sendOTP, updateProfile, verifyOtp } from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { multerMiddleware } from "../config/cloudinary.js";

const router = express.Router();

router.post("/send-otp",sendOTP);
router.post("/verify-otp",verifyOtp);
router.get("/logout",logout)

//protected routes
router.put('/update-profile', authMiddleware, multerMiddleware, updateProfile)
router.get("/check-auth",authMiddleware, checkAuthenticated)
router.get("/users",authMiddleware, getAllUsers)

export default router;
