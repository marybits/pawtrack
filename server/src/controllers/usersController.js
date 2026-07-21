import jwt from "jsonwebtoken";
import { createUser, findByUsername, verifyPassword } from "../services/usersService.js";

function signToken(userId) {
  return jwt.sign({ userId: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

export async function register(req, res) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "username, email, and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const user = await createUser(username, email, password);
    const token = signToken(user._id);
    return res.status(201).json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res
        .status(409)
        .json({ message: `${field} is already taken` });
    }
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors)[0].message;
      return res.status(400).json({ message });
    }
    return res.status(500).json({ message: "Server error" });
  }
}

export async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "username and password are required" });
  }

  try {
    const user = await findByUsername(username);
    const valid = user && await verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = signToken(user._id);
    return res.status(200).json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}
