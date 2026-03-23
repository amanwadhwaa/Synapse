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
  const primaryBtn = "flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--color-primary)] text-white shadow-lg shadow-blue-500/25 hover:opacity-90 transition";

  const startStudySession = () => {
    setIsStartModalOpen(true);
  };

  const handleStartSession = async (payload: {
    subjectId: string | null;
    durationMinutes: number;
    subjectName: string;
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

    navigate(`/study-session?time=${payload.durationMinutes}&subject=${payload.subjectId}&subjectName=${encodeURIComponent(payload.subjectName)}`);
  };

  return (
    <div className="px-6 pt-6">
      <StartSessionModal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        onStart={handleStartSession}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="pt-6 mb-8">
          {/* Header Row */}
          <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
            
            {/* Left: Heading + subtext */}
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome back, {firstName}!
              </h1>
              <p className="text-gray-400 text-lg">
                Ready to continue your learning journey?
              </p>
            </div>

            {/* Right: Buttons */}
            <div className="flex items-center gap-3">
                {/* + Button → Create Note */}
                <button
                  onClick={() => navigate('/notes')}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-lg shadow-blue-500/25 hover:opacity-90 transition"
                >
                  +
                </button>

                {/* Study Session (same as Start Study Session) */}
                <button
                  onClick={() => setIsStartModalOpen(true)}
                  className={primaryBtn}
                >
                  Study Session
                </button>

                {/* Group Study */}
                <button
                  className={primaryBtn}
                >
                  Group Study Session
                </button>

                </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--color-primary)] to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center">
                <div className="p-3 bg-[var(--color-primary)]/20 rounded-xl mr-4">
                  <BookOpen className="h-8 w-8 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">24</p>
                  <p className="text-gray-400 text-sm">Notes Created</p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center">
                <div className="p-3 bg-green-500/20 rounded-xl mr-4">
                  <Clock className="h-8 w-8 text-green-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">12h 30m</p>
                  <p className="text-gray-400 text-sm">Study Time</p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center">
                <div className="p-3 bg-orange-500/20 rounded-xl mr-4">
                  <Target className="h-8 w-8 text-orange-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">8</p>
                  <p className="text-gray-400 text-sm">Quizzes Completed</p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center">
                <div className="p-3 bg-cyan-500/20 rounded-xl mr-4">
                  <TrendingUp className="h-8 w-8 text-cyan-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">85%</p>
                  <p className="text-gray-400 text-sm">Average Score</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Heatmap */}
        <ActivityHeatmap />

      </div>
    </div>
  );
}

export default Dashboard;
