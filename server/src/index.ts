import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import prisma from "./prisma";
import { router as authRoutes } from "./routes/auth";
import notesRoutes from "./routes/notes";
import subjectsRoutes from "./routes/subjects";
import sessionsRoutes from "./routes/sessions";
import imageRoutes from "./routes/image";
import aiRoutes from "./routes/ai";
import studyPlanRoutes from "./routes/studyPlan";
import examsRoutes from "./routes/exam";
import quizzesRoutes from "./routes/quizzes";

dotenv.config();

const app = express();
// const prisma = new PrismaClient({});

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
      "http://localhost:5177",
    ],
    credentials: true,
  }),
);
app.use(helmet());
app.use(morgan("combined"));
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/subjects", subjectsRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/notes", imageRoutes); // Mount image routes under /api/notes
app.use("/api/ai", aiRoutes);
app.use("/api/quizzes", quizzesRoutes);
app.use("/api/study-plan", studyPlanRoutes);
app.use("/api/exams", examsRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
