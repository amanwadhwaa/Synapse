interface StudyDay {
  date: string;
  subjects: string[];
}

interface StudyPlanProps {
  plan: StudyDay[];
}

export default function StudyPlan({ plan }: StudyPlanProps) {
  if (!plan || plan.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="font-serif text-2xl text-white mb-6">
        Your Study Plan
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plan.map((day, index) => (
          <div
            key={index}
            className="glass-card rounded-2xl p-5 hover:border-violet-500/30 transition-all duration-500 hover:shadow-[0_0_20px_-10px_rgba(139,92,246,0.2)]"
          >
            <h3 className="font-serif text-lg text-violet-300 mb-3">
              {day.date}
            </h3>

            <ul className="space-y-2">
              {day.subjects.map((subject, i) => (
                <li
                  key={i}
                  className="bg-white/[0.03] border border-white/5 px-3 py-2 rounded-xl text-neutral-200 text-sm"
                >
                  {subject}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
