import { useState } from "react";
import ExamForm from "../components/ExamForm";
import GeneratePlan from "../components/GeneratePlan";
import StudyPlan from "../components/StudyPlan";
import { useEffect } from "react";
import { useAuthStore } from "../stores/auth";

export default function StudyPlanner() {
  const [plan, setPlan] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);

  const { user } = useAuthStore();

  useEffect(() => {
    const fetchExams = async () => {
      const res = await fetch(
        `http://localhost:5000/api/exams?userId=${user?.id}`,
      );
      const data = await res.json();
      setExams(data);
    };

    if (user?.id) fetchExams();
  }, [user]);

  const deleteExam = async (id: string) => {
    await fetch(`http://localhost:5000/api/exams/${id}`, {
      method: "DELETE",
    });

    setExams(exams.filter((e) => e.id !== id));
  };

  return (
    <div className="px-6 py-8">
      <h1 className="font-serif text-3xl md:text-4xl text-white mb-6 tracking-tight">Study Planner</h1>

      <div className="glass-card rounded-2xl p-6 max-w-md">
        <ExamForm setExams={setExams} />
      </div>

      <h2 className="font-serif text-xl text-white mt-8 mb-4">Your Exams</h2>

      <div className="space-y-3">
        {exams.map((exam) => (
          <div
            key={exam.id}
            className="glass-card rounded-xl p-4 flex justify-between items-center"
          >
            <div>
              <p className="text-white font-medium">{exam.subject}</p>
              <p className="text-neutral-500 text-sm">
                {new Date(exam.examDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <span className="text-violet-400 text-sm">{exam.difficulty}</span>

            <button
              onClick={() => deleteExam(exam.id)}
              className="text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <GeneratePlan setPlan={setPlan} />
      </div>

      <div className="mt-8">
        <StudyPlan plan={plan} />
      </div>
    </div>
  );
}
