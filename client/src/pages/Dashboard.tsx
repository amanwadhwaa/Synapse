import { BookOpen, Clock, Target, TrendingUp } from "lucide-react";
import ActivityHeatmap from "../components/ActivityHeatmap";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth";
import { useState } from "react";
import { apiRequest } from "../services/api";
import StartSessionModal from "../components/StartSessionModal";

function Dashboard() {
  // TODO: Replace with actual user from auth store
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] || "there";
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);

  const startStudySession = () => {
    setIsStartModalOpen(true);
  };

  const handleStartSession = async (payload: {
    subjectId: string | null;
    durationMinutes: number;
  }) => {
    setIsStartModalOpen(false);

    try {
      await apiRequest("/sessions", "POST", {
        subjectId: payload.subjectId,
        durationMinutes: payload.durationMinutes,
        type: "MANUAL",
      });
    } catch (error) {
      console.error("Failed to log study session", error);
    }

    navigate(`/study-session?time=${payload.durationMinutes}`);
  };

  const stats = [
    { label: 'Notes Created', value: '24', icon: BookOpen, gradient: 'from-violet-500/20 to-purple-600/20', iconBg: 'bg-violet-500/20', iconColor: 'text-violet-400' },
    { label: 'Study Time', value: '12h 30m', icon: Clock, gradient: 'from-emerald-500/20 to-teal-600/20', iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-400' },
    { label: 'Quizzes Completed', value: '8', icon: Target, gradient: 'from-cyan-500/20 to-blue-600/20', iconBg: 'bg-cyan-500/20', iconColor: 'text-cyan-400' },
    { label: 'Average Score', value: '85%', icon: TrendingUp, gradient: 'from-violet-500/20 to-fuchsia-600/20', iconBg: 'bg-violet-500/15', iconColor: 'text-violet-300' },
  ]

  return (
    <div className="px-6 pt-6 pb-8">
      <StartSessionModal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        onStart={handleStartSession}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="pt-6 mb-8">
          <h1 className="font-serif text-4xl md:text-5xl text-white mb-2 tracking-tight">
            Welcome back, <span className="text-shimmer">{firstName}</span>!
          </h1>
          <p className="text-neutral-400 text-lg font-light">
            Ready to continue your learning journey?
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="group glass-card rounded-2xl p-6 hover:-translate-y-2 transition-all duration-500 hover:border-violet-500/30 hover:shadow-[0_0_25px_-10px_rgba(139,92,246,0.3)]">
                <div className="flex items-center">
                  <div className={`p-3 ${stat.iconBg} rounded-xl mr-4 group-hover:scale-110 transition-transform duration-500`}>
                    <Icon className={`h-7 w-7 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                    <p className="text-neutral-500 text-sm">{stat.label}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Activity Heatmap */}
        <ActivityHeatmap />

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-serif text-2xl text-white mb-6">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/notes")}
                className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-6 py-4 rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.02] text-left font-medium"
              >
                Create New Note
              </button>
              <button
                onClick={startStudySession}
                className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-6 py-4 rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.02] text-left font-medium"
              >
                Start Study Session
              </button>
              <button
                onClick={() => navigate("/quizzes")}
                className="w-full border border-white/10 hover:border-violet-500/30 text-white px-6 py-4 rounded-xl transition-all duration-300 bg-white/[0.02] hover:bg-white/[0.05] text-left font-medium hover:shadow-[0_0_20px_-10px_rgba(139,92,246,0.2)]"
              >
                Generate Quiz
              </button>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-serif text-2xl text-white mb-6">
              Recent Activity
            </h2>
            <div className="space-y-3">
              <div className="flex items-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="w-2.5 h-2.5 bg-violet-400 rounded-full mr-4"></div>
                <div>
                  <span className="text-white text-sm">
                    Completed "Data Structures" quiz - 92%
                  </span>
                  <p className="text-neutral-500 text-xs">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full mr-4"></div>
                <div>
                  <span className="text-white text-sm">
                    Added notes for "Machine Learning" subject
                  </span>
                  <p className="text-neutral-500 text-xs">1 day ago</p>
                </div>
              </div>
              <div className="flex items-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full mr-4"></div>
                <div>
                  <span className="text-white text-sm">
                    Study session: 45 minutes focused
                  </span>
                  <p className="text-neutral-500 text-xs">2 days ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
