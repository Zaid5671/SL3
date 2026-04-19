import mongoose from "mongoose";

const { Schema } = mongoose;

const projectSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // null = personal project, string = collaborative room ID
    roomId: {
      type: String,
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
  },
  {
    timestamps: true,
  },
);

projectSchema.index({ roomId: 1, createdAt: -1 });
projectSchema.index({ user: 1, roomId: 1, createdAt: -1 });

const Project = mongoose.model("Project", projectSchema);
export default Project;
