import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import { uploadMiddleware } from "../config/cloudinary.js";
import { getUserDetails, searchUsers, updateProfile } from "../controllers/user.controller.js";

const router = express.Router();

router.use(authMiddleware);
router.get("/", searchUsers);
router.put("/profile/me", uploadMiddleware.single("avatar"), updateProfile);
router.get("/:userId", getUserDetails);

export default router;
