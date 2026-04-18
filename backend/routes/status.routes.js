import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { multerMiddleware } from "../config/cloudinary.js";
import { createStatus, getStatus, viewStatus, deleteStatus } from "../controllers/status.controller.js";

const router = express.Router();

router.post("/",authMiddleware , multerMiddleware ,createStatus );
router.get("/conversation",authMiddleware, getStatus)
router.put('/:statusId/view', authMiddleware, viewStatus)
router.delete('/:statusId', authMiddleware, deleteStatus)

export default router;
