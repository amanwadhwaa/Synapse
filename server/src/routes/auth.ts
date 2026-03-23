import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../prisma";
import { authMiddleware, AuthRequest as MiddlewareAuthRequest } from "../middleware/auth";
import { RegisterRequest, AuthRequest, LoginResponse } from "synapse-shared";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "secret";

router.post("/register", async (req, res) => {
  try {
    const { name, email, password }: RegisterRequest = req.body;

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        language: "english",
      },
    });

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);

    const response: LoginResponse = {
      token,
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        institution: user.institution || undefined,
        grade: user.grade || undefined,
        language: user.language,
        createdAt: user.createdAt,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password }: AuthRequest = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);

    const response: LoginResponse = {
      token,
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        institution: user.institution || undefined,
        grade: user.grade || undefined,
        language: user.language,
        createdAt: user.createdAt,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/profile", authMiddleware, async (req: MiddlewareAuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        institution: true,
        grade: true,
        language: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.put("/profile", authMiddleware, async (req: MiddlewareAuthRequest, res) => {
  try {
    const {
      name,
      institution,
      grade,
      language,
    }: {
      name?: string;
      institution?: string;
      grade?: string;
      language?: string;
    } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: "Name cannot be empty" });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(institution !== undefined ? { institution: institution.trim() || null } : {}),
        ...(grade !== undefined ? { grade: grade.trim() || null } : {}),
        ...(language !== undefined
          ? { language: language.trim().toLowerCase() || "english" }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        institution: true,
        grade: true,
        language: true,
        createdAt: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});
export { router };
