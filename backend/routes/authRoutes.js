import express from "express";
import { authUser, registerUser } from "../controllers/userController.js";
import { sendOTP, verifyOtp } from "../controllers/authController.js";

const router = express.Router();

// router.route("/").post(registerUser);
// router.post("/login",authUser);
router.post("/send-otp",sendOTP);
router.post("/verify-otp",verifyOtp);

export default router;