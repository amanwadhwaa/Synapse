import { useState } from "react";
import { BarChart3, TrendingUp, Award, AlertCircle, ChevronDown, ChevronUp, Brain, Calendar, Clock, TrendingDown, BookOpen, Target, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { useBrainFatigueData, useForgettingCurveData, usePerformanceData } from "../hooks/usePerformanceData";

function Performance() {
  const markdownComponents = {
    strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold text-white">{children}</strong>,
    p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2">{children}</p>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside space-y-1 mt-2">{children}</ol>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside space-y-1 mt-2">{children}</ul>,
    li: ({ children }: { children?: React.ReactNode }) => <li className="ml-2">{children}</li>,
  };

  const {
    data,
    isLoading: loading,
    isRevalidating: isPerformanceRevalidating,
  } = usePerformanceData();
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const {
    data: brainFatigueData,
    isLoading: brainFatigueLoading,
    isRevalidating: isFatigueRevalidating,
  } = useBrainFatigueData();
  const {
    data: forgettingCurveData,
    isLoading: forgettingCurveLoading,
    isRevalidating: isForgettingCurveRevalidating,
  } = useForgettingCurveData();
  const [brainFatigueInfoOpen, setBrainFatigueInfoOpen] = useState(false);
  const [forgettingCurveInfoOpen, setForgettingCurveInfoOpen] = useState(false);

  const formatHour = (hour: number | null | undefined) => {
    if (hour === null || hour === undefined || Number.isNaN(hour)) return "--";
    const h = hour % 24;
    if (h < 0) return "--";
    if (h === 0) return "12:00 AM";
    if (h < 12) return `${h}:00 AM`;
    if (h === 12) return "12:00 PM";
    return `${h - 12}:00 PM`;
  };

  const formatHourRange = (hour: number | null | undefined) => {
    if (hour === null || hour === undefined || Number.isNaN(hour)) return "--";
    const start = ((hour % 24) + 24) % 24;
    const end = (start + 2) % 24;
    return `${formatHour(start)} - ${formatHour(end)}`;
  };

  const showMainLoading = loading;
  const showMainError = !loading && !data;
  const showMainEmpty = !loading && Boolean(data) && data.totalQuizzes === 0;

  // Prepare chart data
  const correctTotal = (data?.topicBreakdown || []).reduce((sum, item) => sum + item.correct, 0);
  const incorrectTotal = (data?.topicBreakdown || []).reduce((sum, item) => sum + item.incorrect, 0);
  const pieData =
    correctTotal + incorrectTotal > 0
      ? [
          { name: "Correct", value: correctTotal, color: "#10b981" },
          { name: "Incorrect", value: incorrectTotal, color: "#ef4444" },
        ]
      : [];

  const COLORS = [pieData[0]?.color || "#10b981", pieData[1]?.color || "#ef4444"];

  // Toggle accordion function
  const toggleSubject = (subject: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subject)) {
      newExpanded.delete(subject);
    } else {
      newExpanded.add(subject);
    }
    setExpandedSubjects(newExpanded);
  };

  // Group quiz breakdown by subject
  const quizzesBySubject = (data?.quizBreakdown || []).reduce((acc, quiz) => {
    if (!acc[quiz.subject]) {
      acc[quiz.subject] = [];
    }
    acc[quiz.subject].push(quiz);
    return acc;
  }, {} as Record<string, NonNullable<typeof data>["quizBreakdown"]>);

  // Prepare radar chart data
  const radarData = (data?.scoreBySubject || []).map((subject) => ({
    subject: subject.subject,
    score: subject.averageScore,
  }));

  // Helper function to render stat cards
  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
    textSize = "text-xl",
  }: {
    icon: React.ComponentType<{ className: string }>;
    label: string;
    value: string | number;
    color: string;
    textSize?: string;
  }) => (
    <div className="group relative min-w-[150px]">
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${color} rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000`} />
      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
        <div className="flex items-start gap-3">
          <div className={`p-3 ${color} bg-opacity-20 rounded-xl flex-shrink-0`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className={`${textSize} font-bold text-white break-words`}>{value}</p>
            <p className="text-gray-400 text-sm">{label}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="px-6 pt-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="pt-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-white">Quiz Performance</h1>
            {isPerformanceRevalidating && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="h-3 w-3 rounded-full border border-blue-300 border-t-transparent animate-spin" />
                Updating
              </div>
            )}
          </div>
          <p className="text-gray-400 text-lg">Track your quiz performance and progress</p>
        </div>

        {showMainLoading ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white/5 rounded-2xl p-6 h-24 animate-pulse" />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/5 rounded-2xl p-6 h-80 animate-pulse" />
              <div className="bg-white/5 rounded-2xl p-6 h-80 animate-pulse" />
            </div>

            <div className="bg-white/5 rounded-2xl p-6 h-48 animate-pulse mb-8" />
          </>
        ) : showMainError ? (
          <div className="flex items-center justify-center min-h-96 mb-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Error Loading Data</h2>
              <p className="text-gray-400">An error occurred while loading your performance data</p>
            </div>
          </div>
        ) : showMainEmpty ? (
          <div className="flex items-center justify-center min-h-96 mb-8">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No Quizzes Yet</h2>
              <p className="text-gray-400 mb-6">Start taking quizzes to see your performance metrics here</p>
            </div>
          </div>
        ) : (
          <>
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={BarChart3}
            label="Total Quizzes"
            value={data.totalQuizzes}
            color="from-[var(--color-primary)] to-purple-600"
          />
          <StatCard
            icon={TrendingUp}
            label="Average Score"
            value={`${data.averageScore}%`}
            color="from-blue-500 to-cyan-600"
          />
          <StatCard
            icon={Award}
            label="Best Subject"
            value={data.bestSubject || "—"}
            color="from-green-500 to-emerald-600"
          />
          <StatCard
            icon={AlertCircle}
            label="Weakest Subject"
            value={data.weakestSubject || "—"}
            color="from-orange-500 to-red-600"
          />
        </div>

        {/* Overall AI Analysis Card */}
        <div className="group relative mb-8">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000" />
          <div className="relative bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-red-600/20 backdrop-blur-xl border border-white/20 rounded-2xl p-8 hover:bg-white/5 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">AI Study Coach Analysis</h2>
                <div className="text-gray-200 leading-relaxed text-lg">
                  <ReactMarkdown components={markdownComponents}>{data.aiAnalysis}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Line Chart - Score Trend */}
          <div className="lg:col-span-2 group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
              <h2 className="text-xl font-semibold text-white mb-6">Score Trend Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.scoreOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" />
                  <YAxis stroke="rgba(255,255,255,0.6)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Radar Chart - Subject Performance */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
              <h2 className="text-xl font-semibold text-white mb-6">Subject Performance</h2>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }}
                    />
                    <Radar
                      name="Score %"
                      dataKey="score"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-80 text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Pie Chart - Correct vs Incorrect */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
              <h2 className="text-xl font-semibold text-white mb-6">Answer Breakdown</h2>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-80 text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Score Distribution Chart */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
              <h2 className="text-xl font-semibold text-white mb-6">Score Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="range" stroke="rgba(255,255,255,0.6)" />
                  <YAxis stroke="rgba(255,255,255,0.6)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" name="Quiz Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart - Score by Subject */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
              <h2 className="text-xl font-semibold text-white mb-6">Average Score by Subject</h2>
              {data.scoreBySubject.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.scoreBySubject}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="subject" stroke="rgba(255,255,255,0.6)" />
                    <YAxis stroke="rgba(255,255,255,0.6)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="averageScore" fill="#3b82f6" name="Average Score (%)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-80 text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>

          </>
        )}

        {/* Brain Fatigue Detector */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Brain Fatigue Detector</h2>
            {isFatigueRevalidating && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="h-3 w-3 rounded-full border border-blue-300 border-t-transparent animate-spin" />
                Updating
              </div>
            )}
          </div>
          
          {brainFatigueLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-2xl p-6 h-80 animate-pulse" />
              <div className="bg-white/5 rounded-2xl p-6 h-80 animate-pulse" />
            </div>
          ) : !brainFatigueData || brainFatigueData.totalAttempts < 5 ? (
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
                    <AlertCircle className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Not Enough Data</h3>
                    <p className="text-gray-300">
                      Take more quizzes at different times to unlock Brain Fatigue Analysis. 
                      Need at least 5 quiz attempts across various hours/days.
                      {brainFatigueData ? ` (Current: ${brainFatigueData.totalAttempts} attempts)` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Brain Fatigue “How to Read This” */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">How to Read Your Brain Fatigue Analysis</h3>
                  <button
                    onClick={() => setBrainFatigueInfoOpen((open) => !open)}
                    className="text-sm font-semibold text-blue-300 hover:text-white"
                  >
                    {brainFatigueInfoOpen ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div
                  className={`border-l-4 border-blue-400 bg-blue-950/30 p-4 rounded-2xl text-gray-200 transition-all duration-300 ${
                    brainFatigueInfoOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                  }`}
                >
                  <p className="text-sm leading-relaxed mb-3">The Science: Research in chronobiology shows that cognitive performance follows your circadian rhythm — your brain's internal 24-hour clock. Most people have a peak performance window of 2-4 hours where focus, memory retention and problem-solving are at their best.</p>
                  <p className="text-sm font-semibold mb-1">Reading the Hour Chart:</p>
                  <ul className="list-disc list-inside text-sm mb-3">
                    <li>Peaks (high points) = when your brain is most alert</li>
                    <li>Valleys (low points) = when mental fatigue sets in</li>
                    <li>The green highlighted zone = your optimal study window</li>
                  </ul>
                  <p className="text-sm font-semibold mb-1">Reading the Day Chart:</p>
                  <ul className="list-disc list-inside text-sm mb-3">
                    <li>Taller bars = better performance on that day</li>
                    <li>Shorter bars = mental fatigue or distraction on that day</li>
                    <li>Use this to plan which subjects to study on which days</li>
                  </ul>
                  <p className="text-sm">Pro Tip: Study your hardest subjects during your peak window and use your low-performance hours for light revision or breaks.</p>
                </div>
              </div>

              {/* Brain Fatigue Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard
                  icon={TrendingUp}
                  label="Peak Hour"
                  value={formatHourRange(brainFatigueData.peakHour)}
                  color="from-green-500 to-emerald-600"
                />
                <StatCard
                  icon={TrendingDown}
                  label="Avoid"
                  value={formatHourRange(brainFatigueData.worstHour)}
                  color="from-red-500 to-pink-600"
                />
                <StatCard
                  icon={Calendar}
                  label="Best Day"
                  value={brainFatigueData.peakDay || '-'}
                  color="from-blue-500 to-cyan-600"
                />
                <StatCard
                  icon={Clock}
                  label="Performance Drop"
                  value={`${brainFatigueData.fatigueDropPercent ?? 0}%`}
                  color="from-purple-500 to-indigo-600"
                />
              </div>

              {/* Optimal Study Window Recommendation */}
              <div className="mb-6">
                <div className="p-6 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 border border-white/20 rounded-2xl">
                  <p className="text-gray-300 text-lg leading-relaxed">
                    <span className="text-white font-semibold">Study between {formatHourRange(brainFatigueData.peakHour)} on {brainFatigueData.peakDay || 'your best day'} for best results.</span>
                    <br />
                    Avoid studying between {formatHourRange(brainFatigueData.worstHour)} — your performance drops by {brainFatigueData.fatigueDropPercent ?? 0}%.
                  </p>
                </div>
              </div>

              {/* Brain Fatigue Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Hourly Performance Line Chart */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
                  <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
                    <h3 className="text-xl font-semibold text-white mb-6">Performance by Hour of Day</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={brainFatigueData.byHour}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                          dataKey="hour" 
                          stroke="rgba(255,255,255,0.6)"
                          tickFormatter={(hour) => `${hour}:00`}
                        />
                        <YAxis stroke="rgba(255,255,255,0.6)" domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(0,0,0,0.8)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                          labelFormatter={(hour) => `Hour: ${hour}:00`}
                        />
                        <Line
                          type="monotone"
                          dataKey="averageScore"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ fill: "#10b981", r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Daily Performance Bar Chart */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
                  <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
                    <h3 className="text-xl font-semibold text-white mb-6">Performance by Day of Week</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={brainFatigueData.byDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                          dataKey="day" 
                          stroke="rgba(255,255,255,0.6)"
                          tick={{ fontSize: 12 }}
                          interval={0}
                          tickFormatter={(d) => {
                            const map: Record<string, string> = {
                              Sunday: 'Sun',
                              Monday: 'Mon',
                              Tuesday: 'Tue',
                              Wednesday: 'Wed',
                              Thursday: 'Thu',
                              Friday: 'Fri',
                              Saturday: 'Sat',
                            };
                            return map[d as string] || String(d);
                          }}
                        />
                        <YAxis stroke="rgba(255,255,255,0.6)" domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(0,0,0,0.8)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                        />
                        <Bar dataKey="averageScore" fill="#10b981" name="Average Score" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Brain Fatigue AI Insights */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000" />
                <div className="relative bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-red-600/20 backdrop-blur-xl border border-white/20 rounded-2xl p-8 hover:bg-white/5 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex-shrink-0">
                      <Brain className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-4">Neuroscience-Based Study Insights</h3>
                      <div className="text-gray-200 leading-relaxed text-lg">
                        <ReactMarkdown components={markdownComponents}>
                          {brainFatigueData.aiInsights || brainFatigueData.aiInsight || ""}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Forgetting Curve Tracker */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Forgetting Curve Tracker</h2>
            {isForgettingCurveRevalidating && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="h-3 w-3 rounded-full border border-blue-300 border-t-transparent animate-spin" />
                Updating
              </div>
            )}
          </div>

          {/* Forgetting Curve “How to Read This” */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-white">How to Read Your Forgetting Curve</h3>
              <button
                onClick={() => setForgettingCurveInfoOpen((open) => !open)}
                className="text-sm font-semibold text-indigo-300 hover:text-white"
              >
                {forgettingCurveInfoOpen ? 'Hide' : 'Show'}
              </button>
            </div>
            <div
              className={`border-l-4 border-purple-500 bg-purple-950/30 p-4 rounded-2xl text-gray-200 transition-all duration-300 ${
                forgettingCurveInfoOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
              }`}
            >
              <p className="text-sm leading-relaxed mb-3">The Science: In 1885, psychologist Hermann Ebbinghaus discovered that humans forget information in a predictable pattern called the Forgetting Curve. Without review, we forget: 58% in 24 hours, 65% in a week, 75% in a month.</p>
              <p className="text-sm leading-relaxed mb-3">But YOUR forgetting curve is unique — some people forget faster, some slower. This tracker measures YOUR personal forgetting rate per subject.</p>
              <p className="text-sm font-semibold mb-1">Reading the Graph:</p>
              <ul className="list-disc list-inside text-sm mb-3">
                <li>Each colored line = one subject</li>
                <li>Downward slope = forgetting happening</li>
                <li>Steep drop = fast forgetter for that subject</li>
                <li>Flat line = good retention for that subject</li>
              </ul>
              <p className="text-sm font-semibold mb-1">Status Badge Guide:</p>
              <ul className="list-disc list-inside text-sm mb-3">
                <li>Fresh (0-3 days) = Memory is strong, no action needed</li>
                <li>Fading (4-7 days) = Review soon to strengthen memory</li>
                <li>Critical (8-14 days) = Review today or risk forgetting</li>
                <li>Forgotten (14+ days) = Memory likely lost, retake quiz</li>
              </ul>
              <p className="text-sm">Spaced Repetition Tip: The best time to review is just BEFORE you forget — not immediately after learning. This is called Spaced Repetition and it's the most scientifically proven study technique.</p>
            </div>
          </div>

          {forgettingCurveLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-2xl p-6 h-80 animate-pulse" />
              <div className="bg-white/5 rounded-2xl p-6 h-80 animate-pulse" />
            </div>
          ) : !forgettingCurveData || forgettingCurveData.subjects.length === 0 ? (
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                    <BookOpen className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Data Yet</h3>
                    <p className="text-gray-300">
                      Take quizzes over time to see your forgetting curves and get personalized review recommendations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Subject Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {forgettingCurveData.subjects.map((subject: any) => {
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case "fresh": return "border-green-500 bg-green-500/10";
                      case "fading": return "border-yellow-500 bg-yellow-500/10";
                      case "critical": return "border-red-500 bg-red-500/10";
                      case "forgotten": return "border-gray-500 bg-gray-500/10";
                      default: return "border-gray-500 bg-gray-500/10";
                    }
                  };

                  const getStatusIcon = (status: string) => {
                    switch (status) {
                      case "fresh": return "F";
                      case "fading": return "!";
                      case "critical": return "C";
                      case "forgotten": return "X";
                      default: return "?";
                    }
                  };

                  return (
                    <div key={subject.subject} className={`group relative border-2 rounded-2xl p-6 transition-all duration-300 ${getStatusColor(subject.status)}`}>
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">{subject.subject}</h3>
                        <span className="text-2xl">{getStatusIcon(subject.status)}</span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Latest Score:</span>
                          <span className="text-white font-medium">{subject.latestScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Days Since Review:</span>
                          <span className="text-white font-medium">{subject.daysSinceLastAttempt}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Predicted in 7 days:</span>
                          <span className="text-white font-medium">{subject.predictedScoreIn7Days}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Forgetting Curve Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
                  <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
                    <h3 className="text-xl font-semibold text-white mb-6">Forgetting Curves Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                          dataKey="daysSinceFirst"
                          stroke="rgba(255,255,255,0.6)"
                          label={{ value: 'Days Since First Attempt', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'rgba(255,255,255,0.6)' } }}
                        />
                        <YAxis
                          stroke="rgba(255,255,255,0.6)"
                          domain={[0, 100]}
                          label={{ value: 'Score %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'rgba(255,255,255,0.6)' } }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(0,0,0,0.8)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                          labelFormatter={(days) => `${days} days ago`}
                        />
                        <Legend />
                        {forgettingCurveData.subjects.map((subject: any, index: number) => {
                          const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                          const color = colors[index % colors.length];

                          // Transform data to show days since first attempt
                          const firstDate = new Date(subject.allAttempts[0].date);
                          const transformedData = subject.allAttempts.map((attempt: any) => {
                            const attemptDate = new Date(attempt.date);
                            const daysSinceFirst = Math.floor((attemptDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
                            return {
                              daysSinceFirst,
                              [subject.subject]: attempt.score,
                            };
                          });

                          return (
                            <Line
                              key={subject.subject}
                              type="monotone"
                              dataKey={subject.subject}
                              data={transformedData}
                              stroke={color}
                              strokeWidth={2}
                              dot={{ fill: color, r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Priority Review List */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
                  <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
                    <h3 className="text-xl font-semibold text-white mb-6">Priority Review List</h3>
                    <div className="space-y-4">
                      {forgettingCurveData.subjects
                        .sort((a: any, b: any) => {
                          const statusOrder: Record<string, number> = { forgotten: 3, critical: 2, fading: 1, fresh: 0 };
                          return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
                        })
                        .map((subject: any) => (
                          <div key={subject.subject} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                subject.status === 'fresh' ? 'bg-green-500' :
                                subject.status === 'fading' ? 'bg-yellow-500' :
                                subject.status === 'critical' ? 'bg-red-500' : 'bg-gray-500'
                              }`} />
                              <div>
                                <p className="text-white font-medium">{subject.subject}</p>
                                <p className="text-gray-400 text-sm">{subject.daysSinceLastAttempt} days ago</p>
                              </div>
                            </div>
                            {(subject.status === 'critical' || subject.status === 'forgotten') && (
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-red-400" />
                                <span className="text-red-400 text-sm font-medium">Review today!</span>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Memory Coach */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000" />
                <div className="relative bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-red-600/20 backdrop-blur-xl border border-white/20 rounded-2xl p-8 hover:bg-white/5 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex-shrink-0">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-4">Memory Coach Insights</h3>
                      <div className="text-gray-200 leading-relaxed text-lg">
                        <ReactMarkdown components={markdownComponents}>{forgettingCurveData.aiInsight}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Per-Subject Analysis */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-6">Detailed Subject Analysis</h2>
          {Object.entries(quizzesBySubject).map(([subject, quizzes]) => {
            const subjectData = data.scoreBySubject.find(s => s.subject === subject);
            const averageScore = subjectData?.averageScore || 0;
            const isExpanded = expandedSubjects.has(subject);

            // Prepare quiz scores for bar chart
            const quizScores = quizzes.map((quiz, index) => ({
              name: `Quiz ${index + 1}`,
              score: quiz.percentage,
              date: new Date(quiz.completedAt).toLocaleDateString(),
            }));

            // Get weak and strong topics for this subject
            const subjectQuizzes = quizzes.filter(q => q.subject === subject);
            const topicPerformance: Record<string, { correct: number; total: number }> = {};

            subjectQuizzes.forEach(quiz => {
              quiz.wrongTopics.forEach(topic => {
                if (!topicPerformance[topic]) {
                  topicPerformance[topic] = { correct: 0, total: 0 };
                }
                topicPerformance[topic].total += 1;
              });
            });

            const weakTopics = Object.entries(topicPerformance)
              .filter(([_, perf]) => perf.total > 0)
              .sort((a, b) => b[1].total - a[1].total)
              .slice(0, 3);

            const strongTopics = Object.entries(topicPerformance)
              .filter(([_, perf]) => perf.total === 0)
              .slice(0, 3);

            return (
              <div key={subject} className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-500 to-gray-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                  {/* Subject Header */}
                  <div
                    className="p-6 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => toggleSubject(subject)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          averageScore >= 80 ? 'bg-green-500/20' :
                          averageScore >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                        }`}>
                          <BarChart3 className={`h-6 w-6 ${
                            averageScore >= 80 ? 'text-green-400' :
                            averageScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                          }`} />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-white">{subject}</h3>
                          <p className="text-gray-400">Average Score: {averageScore}% • {quizzes.length} quizzes</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-white/10 p-6 space-y-6">
                      {/* Quiz Scores Chart */}
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-4">Quiz Performance</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={quizScores}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" />
                            <YAxis stroke="rgba(255,255,255,0.6)" domain={[0, 100]} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "rgba(0,0,0,0.8)",
                                border: "1px solid rgba(255,255,255,0.2)",
                                borderRadius: "8px",
                                color: "#fff",
                              }}
                              labelFormatter={(label, payload) => {
                                const data = payload?.[0]?.payload;
                                return `${label} - ${data?.date}`;
                              }}
                            />
                            <Bar dataKey="score" fill="#3b82f6" name="Score (%)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Topics Analysis */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-400" />
                            Weak Topics
                          </h4>
                          {weakTopics.length > 0 ? (
                            <div className="space-y-2">
                              {weakTopics.map(([topic, perf]) => (
                                <div key={topic} className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                  <span className="text-red-300 text-sm">{topic}</span>
                                  <span className="text-red-400 text-xs">Wrong {perf.total}x</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-400 text-sm">No weak topics identified</p>
                          )}
                        </div>

                        <div>
                          <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <Award className="h-5 w-5 text-green-400" />
                            Strong Topics
                          </h4>
                          {strongTopics.length > 0 ? (
                            <div className="space-y-2">
                              {strongTopics.map(([topic]) => (
                                <div key={topic} className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                  <span className="text-green-300 text-sm">{topic}</span>
                                  <span className="text-green-400 text-xs">Perfect</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-400 text-sm">No perfect topics yet</p>
                          )}
                        </div>
                      </div>

                      {/* Individual Quiz Insights */}
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-4">AI Insights</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {quizzes.map((quiz, index) => (
                            <div key={quiz.quizId} className="p-4 bg-white/5 rounded-lg border border-white/10">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-medium">Quiz {index + 1}</span>
                                <span className={`text-sm px-2 py-1 rounded ${
                                  quiz.percentage >= 80 ? 'bg-green-500/20 text-green-300' :
                                  quiz.percentage >= 60 ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-red-500/20 text-red-300'
                                }`}>
                                  {quiz.score}/{quiz.totalQuestions} ({quiz.percentage}%)
                                </span>
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed">{quiz.aiInsight}</p>
                              <p className="text-gray-500 text-xs mt-2">
                                {new Date(quiz.completedAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Performance;
