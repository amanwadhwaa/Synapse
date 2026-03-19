interface GeneratePlanProps {
  setPlan: (plan: any[]) => void;
}

import { useAuthStore } from "../stores/auth";

export default function GeneratePlan({ setPlan }: GeneratePlanProps) {
  const { user } = useAuthStore();
  const generatePlan = async () => {
    const userId = user?.id;
    console.log("userId", userId);
    const res = await fetch("http://localhost:5000/api/study-plan/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();

    setPlan(data.studyPlan || []);
  };

  return (
    <button
      className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition-all duration-300 hover:scale-[1.02]"
      onClick={generatePlan}
    >
      Generate Study Plan
    </button>
  );
}
