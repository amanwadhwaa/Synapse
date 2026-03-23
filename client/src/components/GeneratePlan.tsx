interface GeneratePlanProps {
  setPlan: (plan: any[]) => void;
}

import { useAuthStore } from "../stores/auth";

export default function GeneratePlan({ setPlan }: GeneratePlanProps) {
  const { user } = useAuthStore();
  const generatePlan = async () => {
    const userId = user?.id;
    console.log("userId", userId);
    const res = await fetch("/api/study-plan/generate", {
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
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mt-3"
      onClick={generatePlan}
    >
      Generate Study Plan
    </button>
  );
}
