import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import GeneratePlan from "../components/GeneratePlan";
import StudyPlan from "../components/StudyPlan";
import { useAuthStore } from "../stores/auth";

type Difficulty = "easy" | "medium" | "hard";

type Exam = {
  id: string;
  subject: string;
  examDate: string;
  difficulty: Difficulty;
  time?: string | null;
};

type CalendarDay = {
  date: Date;
  inCurrentMonth: boolean;
};

type StudySession = {
  id: string;
  title: string;
  date: Date;
  time: string;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const difficultyStyles: Record<Difficulty, string> = {
  easy: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
  medium: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
  hard: "bg-red-500/20 text-red-300 border border-red-500/40",
};

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayDifferenceFromToday(date: Date) {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function countdownLabel(date: Date) {
  const diff = dayDifferenceFromToday(date);
  if (diff === 0) return "Today!";
  if (diff > 0) return `In ${diff} day${diff === 1 ? "" : "s"}`;
  const ago = Math.abs(diff);
  return `${ago} day${ago === 1 ? "" : "s"} ago`;
}

function isExamCompleted(examDate: string, examTime?: string | null) {
  const base = new Date(examDate);
  const examDateTime = new Date(base);

  if (examTime) {
    const [hours, minutes] = examTime.split(":").map(Number);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      examDateTime.setHours(hours, minutes, 0, 0);
    }
  } else {
    examDateTime.setHours(23, 59, 59, 999);
  }

  return examDateTime.getTime() < Date.now();
}

function examDateTime(exam: Exam) {
  const d = new Date(exam.examDate);
  if (exam.time) {
    const [hours, minutes] = exam.time.split(":").map(Number);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      d.setHours(hours, minutes, 0, 0);
    }
  }
  return d;
}

function buildCalendarDays(activeMonth: Date): CalendarDay[] {
  const year = activeMonth.getFullYear();
  const month = activeMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstDayMondayIndex = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const totalCells = 42;
  const cells: CalendarDay[] = [];

  for (let i = firstDayMondayIndex - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day), inCurrentMonth: true });
  }

  let nextMonthDay = 1;
  while (cells.length < totalCells) {
    cells.push({
      date: new Date(year, month + 1, nextMonthDay),
      inCurrentMonth: false,
    });
    nextMonthDay += 1;
  }

  return cells;
}

export default function StudyPlanner() {
  const [plan, setPlan] = useState<any[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [examDate, setExamDate] = useState(toDateInputValue(new Date()));
  const [time, setTime] = useState("09:00");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const { user } = useAuthStore();

  useEffect(() => {
    const fetchExams = async () => {
      const res = await fetch(
        `http://localhost:5000/api/exams?userId=${user?.id}`,
      );
      const data = (await res.json()) as Exam[];
      setExams(data);
    };

    if (user?.id) fetchExams();
  }, [user]);

  const deleteExam = async (id: string) => {
    await fetch(`http://localhost:5000/api/exams/${id}`, {
      method: "DELETE",
    });

    setExams((prev) => prev.filter((e) => e.id !== id));
    setSelectedExamId((current) => (current === id ? null : current));
  };

  const addExam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const userId = user?.id;
    if (!userId) return;

    const res = await fetch("http://localhost:5000/api/exams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject,
        examDate,
        time,
        difficulty,
        userId,
      }),
    });

    const newExam = (await res.json()) as Exam;
    setExams((prev) => [...prev, newExam]);
    setSubject("");
    setExamDate(toDateInputValue(new Date()));
    setTime("09:00");
    setDifficulty("medium");
    setIsAddModalOpen(false);
  };

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);

  const todayKey = startOfDay(new Date()).toDateString();

  const studySessions = useMemo<StudySession[]>(() => {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);

    return [
      { id: "ss-1", title: "Morning Review", date: today, time: "09:00" },
      { id: "ss-2", title: "Practice Problems", date: today, time: "14:00" },
      { id: "ss-3", title: "Flashcard Review", date: tomorrow, time: "10:00" },
      { id: "ss-4", title: "Mock Test", date: dayAfterTomorrow, time: "16:00" },
    ];
  }, []);

  const examsByDay = useMemo(() => {
    return exams.reduce<Record<string, Exam[]>>((acc, exam) => {
      const key = startOfDay(new Date(exam.examDate)).toDateString();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(exam);
      return acc;
    }, {});
  }, [exams]);

  const sessionsByDay = useMemo(() => {
    return studySessions.reduce<Record<string, StudySession[]>>((acc, session) => {
      const key = startOfDay(session.date).toDateString();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(session);
      return acc;
    }, {});
  }, [studySessions]);

  const sortedExams = useMemo(() => {
    const upcoming: Exam[] = [];
    const completed: Exam[] = [];

    [...exams]
      .sort((a, b) => examDateTime(a).getTime() - examDateTime(b).getTime())
      .forEach((exam) => {
        if (isExamCompleted(exam.examDate, exam.time)) {
          completed.push(exam);
        } else {
          upcoming.push(exam);
        }
      });

    return [...upcoming, ...completed];
  }, [exams]);

  return (
    <div className="px-6 pt-6 pb-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Study Planner</h1>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Exam
          </button>
        </div>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-lg">
          <div className="mb-5 flex items-center justify-between gap-4">
            <button
              onClick={() => {
                setCalendarMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                );
              }}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-200 hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <h2 className="text-xl md:text-2xl font-semibold text-white text-center">
              {calendarMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const now = new Date();
                  setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
              >
                Today
              </button>
              <button
                onClick={() => {
                  setCalendarMonth(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  );
                }}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-200 hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                className="rounded-lg bg-white/5 border border-white/10 py-2 text-center text-xs md:text-sm text-gray-300 font-medium"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const dayKey = day.date.toDateString();
              const dayExams = examsByDay[dayKey] || [];
              const daySessions = sessionsByDay[dayKey] || [];
              const isToday = dayKey === todayKey;

              return (
                <div
                  key={`${dayKey}-${day.inCurrentMonth ? "current" : "other"}`}
                  className="min-h-28 md:min-h-32 rounded-lg border border-white/10 bg-white/5 p-2 hover:bg-white/[0.08] transition-colors"
                >
                  <div className="mb-2">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                        isToday
                          ? "bg-blue-600 text-white"
                          : day.inCurrentMonth
                            ? "text-gray-200"
                            : "text-gray-500"
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {dayExams.map((exam) => (
                      <div key={exam.id} className="relative">
                        <button
                          onClick={() =>
                            setSelectedExamId((current) =>
                              current === exam.id ? null : exam.id,
                            )
                          }
                          className={`w-full text-left rounded-full px-2.5 py-1 text-[11px] leading-tight font-medium truncate ${difficultyStyles[exam.difficulty]}`}
                          title={`${exam.subject} ${exam.time ? `at ${exam.time}` : ""}`}
                        >
                          {exam.subject}
                        </button>

                        {selectedExamId === exam.id && (
                          <div className="absolute z-20 left-0 top-full mt-1 w-56 rounded-xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl">
                            <p className="text-sm font-semibold text-white">{exam.subject}</p>
                            <p className="text-xs text-gray-300 mt-1">Date: {formatDate(new Date(exam.examDate))}</p>
                            <p className="text-xs text-gray-300">Time: {exam.time || "Not set"}</p>
                            <p className="text-xs text-gray-300 capitalize">Difficulty: {exam.difficulty}</p>
                            <p className="text-sm text-blue-300 font-semibold mt-2">
                              {countdownLabel(new Date(exam.examDate))}
                            </p>
                            <button
                              onClick={() => deleteExam(exam.id)}
                              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-red-600/90 hover:bg-red-500 text-white px-2.5 py-1.5 text-xs"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {daySessions.map((session) => (
                      <div
                        key={session.id}
                        className="rounded-full border border-blue-500/50 text-blue-300 px-2.5 py-1 text-[10px] leading-tight truncate"
                        title={`${session.time} Study Session: ${session.title}`}
                      >
                        {session.time} Study Session: {session.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Your Exams</h2>
          <div className="space-y-3">
            {sortedExams.map((exam) => {
              const examDateObj = new Date(exam.examDate);
              const isToday = dayDifferenceFromToday(examDateObj) === 0;
              const completed = isExamCompleted(exam.examDate, exam.time);

              return (
                <article
                  key={exam.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-lg">{exam.subject}</p>
                      {isToday && !completed && (
                        <span className="rounded-full bg-blue-600/30 border border-blue-500/50 text-blue-300 text-[11px] font-semibold px-2 py-0.5">
                          TODAY
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 mt-1">
                      <Calendar className="inline-block h-3.5 w-3.5 mr-1" />
                      {formatDate(examDateObj)}
                      {exam.time ? ` at ${exam.time}` : ""}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${difficultyStyles[exam.difficulty]}`}
                    >
                      {exam.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8">
                    <p
                      className={`text-lg md:text-2xl font-bold ${
                        completed ? "text-gray-500" : "text-blue-300"
                      }`}
                    >
                      {completed ? "Completed" : countdownLabel(examDateObj)}
                    </p>

                    <button
                      onClick={() => deleteExam(exam.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 px-3 py-1.5 text-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="pt-1">
          <GeneratePlan setPlan={setPlan} />
        </div>

        <div className="pt-2">
          <StudyPlan plan={plan} />
        </div>
      </div>

      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-white mb-5">Add New Exam</h3>

            <form onSubmit={addExam} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Organic Chemistry"
                  className="w-full rounded-xl bg-slate-800 border border-slate-600/80 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/70"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-600/80 text-white px-3 py-2.5 [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-blue-500/70"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Time</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-600/80 text-white px-3 py-2.5 [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-blue-500/70"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-600/80 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/70"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-white/15 text-gray-200 px-4 py-2 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2"
                >
                  Add Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
