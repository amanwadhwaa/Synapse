import express from "express";
import prisma from "../prisma";

const router = express.Router();

router.get("/", async (req, res) => {
  const { userId } = req.query;

  const exams = await prisma.exam.findMany({
    where: {
      userId: String(userId),
    },
    orderBy: {
      examDate: "asc",
    },
  });

  res.json(exams);
});

router.post("/", async (req, res) => {
  try {
    const { subject, examDate, time, difficulty, userId } = req.body;

    const exam = await prisma.exam.create({
      data: {
        subject,
        examDate: new Date(examDate),
        time,
        difficulty,
        userId,
      },
    });

    res.json(exam);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create exam" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.exam.delete({
      where: {
        id: req.params.id,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete exam" });
  }
});

export default router;
