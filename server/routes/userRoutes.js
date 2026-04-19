import express from "express";
const router = express.Router();

import {
  registerUser,
  loginUser,
  getMyProfile,
} from "../controllers/userController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

// Define routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", authMiddleware, getMyProfile);

export default router;
