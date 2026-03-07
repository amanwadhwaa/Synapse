import { BookOpen, Clock, Target, TrendingUp } from 'lucide-react'
import ActivityHeatmap from '../components/ActivityHeatmap';

function Dashboard() {
  // TODO: Replace with actual user from auth store
  const userName = "User";
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome back, {userName}!</h1>
          <p className="text-gray-400 text-lg">Ready to continue your learning journey?</p>
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

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-6">Quick Actions</h2>
            <div className="space-y-4">
              <button className="w-full bg-[var(--color-primary)] hover:bg-blue-600 text-white px-6 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105 text-left font-medium">
                Create New Note
              </button>
              <button className="w-full border border-white/20 hover:border-white/30 text-white px-6 py-4 rounded-xl transition-all duration-200 backdrop-blur-sm bg-white/5 hover:bg-white/10 text-left font-medium">
                Start Study Session
              </button>
              <button className="w-full border border-white/20 hover:border-white/30 text-white px-6 py-4 rounded-xl transition-all duration-200 backdrop-blur-sm bg-white/5 hover:bg-white/10 text-left font-medium">
                Generate Quiz
              </button>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-6">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-center p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                <div className="w-3 h-3 bg-[var(--color-primary)] rounded-full mr-4"></div>
                <div>
                  <span className="text-white text-sm">Completed "Data Structures" quiz - 92%</span>
                  <p className="text-gray-400 text-xs">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-4"></div>
                <div>
                  <span className="text-white text-sm">Added notes for "Machine Learning" subject</span>
                  <p className="text-gray-400 text-xs">1 day ago</p>
                </div>
              </div>
              <div className="flex items-center p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-4"></div>
                <div>
                  <span className="text-white text-sm">Study session: 45 minutes focused</span>
                  <p className="text-gray-400 text-xs">2 days ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard