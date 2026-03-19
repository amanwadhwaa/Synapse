interface ExamFormProps {
  setExams: React.Dispatch<React.SetStateAction<any[]>>;
}
import { useState } from "react";
import { useAuthStore } from "../stores/auth";

export default function ExamForm({ setExams }: ExamFormProps) {
  const [subject, setSubject] = useState("");
  const [examDate, setExamDate] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const { user } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const userId = user?.id;

    const res = await fetch("http://localhost:5000/api/exams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject,
        examDate,
        difficulty,
        userId,
      }),
    });

    const newExam = await res.json();

    setExams((prev) => [...prev, newExam]);

    setSubject("");
    setExamDate("");
    setDifficulty("medium");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-serif text-lg text-white mb-4">Add New Exam</h3>

      <input
        type="text"
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
      />

      <input
        type="date"
        value={examDate}
        onChange={(e) => setExamDate(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
      />

      <select
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition-all duration-300 mt-2"
      >
        Add Exam
      </button>
    </form>
  );
}
