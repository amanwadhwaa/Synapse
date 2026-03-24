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
        `/api/exams?userId=${user?.id}`,
      );
      const data = await res.json();
      setExams(data);
    };

    if (user?.id) fetchExams();
  }, [user]);

  const deleteExam = async (id: string) => {
    await fetch(`/api/exams/${id}`, {
      method: "DELETE",
    });

    setExams(exams.filter((e) => e.id !== id));
  };

  return (
    <div style={{ padding: "24px" }}>
      <h1 className="text-3xl font-bold text-white mb-6">Study Planner</h1>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 max-w-md">
        <ExamForm setExams={setExams} />
      </div>
      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Your Exams</h2>

      <div className="space-y-3">
        {exams.map((exam) => (
          <div
            key={exam.id}
            className="bg-white/5 border border-white/10 rounded-lg p-4 flex justify-between"
          >
            <div>
              <p className="text-white font-medium">{exam.subject}</p>
              <p className="text-gray-400 text-sm">
                {new Date(exam.examDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <span className="text-blue-400">{exam.difficulty}</span>

            <button
              onClick={() => deleteExam(exam.id)}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "20px" }}>
        <GeneratePlan setPlan={setPlan} />
      </div>

      <div style={{ marginTop: "30px" }}>
        <StudyPlan plan={plan} />
      </div>
    </div>
  );
}
