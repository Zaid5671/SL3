import Project from "../models/Project.js";
import Room from "../models/Room.js";
import Link from "../models/Link.js";

function normalizeScope(roomId, scope) {
  const normalizedRoomId = roomId ? roomId.toUpperCase().trim() : null;
  const isPersonalScope =
    scope === "personal" || normalizedRoomId?.startsWith("PERSONAL_");
  const storageRoomId = isPersonalScope ? null : normalizedRoomId;

  return { normalizedRoomId, isPersonalScope, storageRoomId };
}

async function canUserManageProject(userId, project) {
  if (!project) return false;

  if (!project.roomId) {
    return String(project.user) === String(userId);
  }

  const room = await Room.findOne({ roomId: project.roomId, members: userId })
    .select("_id")
    .lean();

  return !!room;
}

// @desc    Create a project folder
// @route   POST /api/projects
// @access  Private
export const createProject = async (req, res) => {
  try {
    const { title, description = "", roomId, scope } = req.body;
    const userId = req.user.id;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Project title is required" });
    }

    const { storageRoomId } = normalizeScope(roomId, scope);

    if (storageRoomId) {
      const room = await Room.findOne({
        roomId: storageRoomId,
        members: userId,
      })
        .select("_id")
        .lean();

      if (!room) {
        return res
          .status(403)
          .json({ message: "You are not a member of this room" });
      }
    }

    const project = await Project.create({
      user: userId,
      roomId: storageRoomId,
      title: title.trim(),
      description: description.trim(),
    });

    return res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    return res.status(500).json({ message: "Server error creating project" });
  }
};

// @desc    Get projects for personal/room scope
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res) => {
  try {
    const { roomId, scope } = req.query;
    const userId = req.user.id;
    const { normalizedRoomId, isPersonalScope, storageRoomId } = normalizeScope(
      roomId,
      scope,
    );

    let query;
    if (isPersonalScope || !normalizedRoomId) {
      query = { user: userId, roomId: null };
    } else if (storageRoomId) {
      const room = await Room.findOne({
        roomId: storageRoomId,
        members: userId,
      })
        .select("_id")
        .lean();

      if (!room) {
        return res
          .status(403)
          .json({ message: "You are not a member of this room" });
      }

      query = { roomId: storageRoomId };
    } else {
      query = { user: userId, roomId: null };
    }

    const projects = await Project.find(query).sort({ createdAt: -1 });
    return res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return res.status(500).json({ message: "Server error fetching projects" });
  }
};

// @desc    Rename/update a project folder
// @route   PUT /api/projects/:id
// @access  Private
export const updateProject = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.user.id;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const canManage = await canUserManageProject(userId, project);
    if (!canManage) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this project" });
    }

    if (title !== undefined) {
      if (!String(title).trim()) {
        return res
          .status(400)
          .json({ message: "Project title cannot be empty" });
      }
      project.title = String(title).trim();
    }

    if (description !== undefined) {
      project.description = String(description).trim();
    }

    await project.save();
    return res.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    return res.status(500).json({ message: "Server error updating project" });
  }
};

// @desc    Delete a project folder and unassign linked cards
// @route   DELETE /api/projects/:id
// @access  Private
export const deleteProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const canManage = await canUserManageProject(userId, project);
    if (!canManage) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this project" });
    }

    await Link.updateMany(
      { project: project._id },
      { $set: { project: null } },
    );
    await Project.findByIdAndDelete(project._id);

    return res.json({
      message: "Project deleted successfully",
      id: project._id,
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return res.status(500).json({ message: "Server error deleting project" });
  }
};
