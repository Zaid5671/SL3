import mongoose from "mongoose";
const { Schema } = mongoose;

const linkSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // ── ROOM: which collaborative shelf this link belongs to ─────────────────
    // null = personal link (no room), string = room's roomId
    roomId: {
      type: String,
      default: null,
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    originalUrl: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    vibe: {
      type: String,
      default: "Educational",
    },
    icon: {
      type: String,
      default: "📘",
    },
    decay: {
      type: Number,
      default: 0,
    },
    contextFeed: {
      status: {
        type: String,
        default: "pending",
      },
      summary: {
        type: String,
        default: "",
      },
      successorUrl: {
        type: String,
        default: "",
      },
      confidence: {
        type: Number,
        default: null,
      },
      sources: [
        {
          type: String,
          trim: true,
        },
      ],
      checkedAt: {
        type: Date,
        default: null,
      },
      provider: {
        type: String,
        default: "perplexity",
      },
      error: {
        type: String,
        default: "",
      },
    },
    contextFeedLastCheckedAt: {
      type: Date,
      default: null,
      index: true,
    },
    contextFeedNextCheckAt: {
      type: Date,
      default: null,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  },
);

const Link = mongoose.model("Link", linkSchema);
export default Link;
