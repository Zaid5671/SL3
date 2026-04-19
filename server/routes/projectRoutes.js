import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
} from "../controllers/projectController.js";

const router = express.Router();

// @route   POST /api/projects
// @desc    Create a project folder
// @access  Private
router.post("/", authMiddleware, createProject);

// @route   GET /api/projects
// @desc    Get project folders for current scope
// @access  Private
router.get("/", authMiddleware, getProjects);

// @route   PUT /api/projects/:id
// @desc    Rename/update project
// @access  Private
router.put("/:id", authMiddleware, updateProject);

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private
router.delete("/:id", authMiddleware, deleteProject);

export default router;
