import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const hasBearer = authHeader.startsWith("Bearer ");

  if (!hasBearer) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured.");
    return res.status(500).json({ message: "Server auth misconfiguration" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.user.id).select("-password");

    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Not authorized, user not found" });
    }

    return next();
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token expired, please log in again" });
    }

    if (error?.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ message: "Invalid token signature, please log in again" });
    }

    console.error("Token verification failed:", error?.message || error);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

export default authMiddleware;
