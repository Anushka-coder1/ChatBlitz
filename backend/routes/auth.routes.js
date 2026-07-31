import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import { completeProfile, getCurrentUser, logout, sendOtp, verifyOtp } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/logout", logout);
router.get("/me", authMiddleware, getCurrentUser);
router.patch("/complete-profile", authMiddleware, completeProfile);

export default router;
