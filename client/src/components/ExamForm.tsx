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

    const res = await fetch("/api/exams", {
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
    <form onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold text-white mb-4">Add New Exam</h3>

      <input
        type="text"
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="bg-slate-800 border border-slate-600 rounded-lg text-white px-4 py-2 w-full"
      />

      <br />
      <br />

      <input
        type="date"
        value={examDate}
        onChange={(e) => setExamDate(e.target.value)}
        className="bg-slate-800 border border-slate-600 rounded-lg text-white px-4 py-2 w-full"
      />

      <br />
      <br />

      <select
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
        className="bg-slate-800 border border-slate-600 rounded-lg text-white px-4 py-2 w-full"
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      <br />
      <br />

      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mt-3"
      >
        Add Exam
      </button>
    </form>
  );
}
