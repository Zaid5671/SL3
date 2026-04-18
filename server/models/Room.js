import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

const roomSchema = new Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    name: {
      type: String,
      trim: true,
      default: "Unnamed Shelf",
    },
  },
  { timestamps: true }
);

// Hash password before saving
roomSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare plain password with hash
roomSchema.methods.matchPassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

const Room = mongoose.model("Room", roomSchema);
export default Room;
