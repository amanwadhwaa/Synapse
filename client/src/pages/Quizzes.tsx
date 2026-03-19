import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Calendar, Trophy } from "lucide-react";
import toast from "react-hot-toast";
import { fetchQuizzes, type QuizListItem } from "../services/quizzes";

function Quizzes() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const data = await fetchQuizzes();
        setQuizzes(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load quizzes");
      } finally {
        setLoading(false);
      }
    };

    void loadQuizzes();
  }, []);

  const groupedQuizzes = useMemo(() => {
    return quizzes.reduce<Record<string, QuizListItem[]>>((acc, quiz) => {
      const group = quiz.subjectName || "General";
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(quiz);
      return acc;
    }, {});
  }, [quizzes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-violet-500" />
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="px-6 pt-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-serif text-4xl text-white mb-8 tracking-tight">Quizzes</h1>
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-neutral-300 text-lg font-light">
              No quizzes yet - go to a note and click Generate Quiz
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-6 pb-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-4xl text-white mb-8 tracking-tight">Quizzes</h1>

        <div className="space-y-8">
          {Object.entries(groupedQuizzes).map(([subjectName, subjectQuizzes]) => (
            <section key={subjectName}>
              <h2 className="font-serif text-2xl text-white mb-4">{subjectName}</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {subjectQuizzes.map((quiz) => {
                  const created = new Date(quiz.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <article
                      key={quiz.id}
                      className="glass-card rounded-2xl p-6 hover:border-violet-500/30 transition-all duration-500 hover:shadow-[0_0_25px_-10px_rgba(139,92,246,0.2)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-violet-400 mb-2 font-mono">
                            {quiz.subjectName}
                          </p>
                          <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">
                            {quiz.noteTitle}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {created}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              {quiz.questionCount} questions
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Trophy className="h-4 w-4" />
                              {quiz.bestScore !== null
                                ? `Best score: ${quiz.bestScore}/${quiz.questionCount}`
                                : "Not attempted"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5">
                        <button
                          onClick={() => navigate(`/quizzes/${quiz.id}`)}
                          className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-white font-semibold shadow-lg shadow-violet-500/20 transition-all duration-300 hover:shadow-violet-500/35 hover:scale-[1.02]"
                        >
                          Attempt Quiz
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Quizzes;
