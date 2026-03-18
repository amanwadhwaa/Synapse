import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  fetchQuizById,
  saveQuizAttempt,
  type QuizDetail,
  type QuizQuestion,
} from "../services/quizzes";

const OPTION_LABELS = ["A", "B", "C", "D"];

function QuizAttempt() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [savedScore, setSavedScore] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadQuiz = async () => {
      try {
        const data = await fetchQuizById(id);

        const parsedQuestions = Array.isArray(data.questions)
          ? data.questions
          : [];

        setQuiz({
          ...data,
          questions: parsedQuestions,
        });
        setAnswers(new Array(parsedQuestions.length).fill(-1));
      } catch (error) {
        console.error(error);
        toast.error("Failed to load quiz");
        navigate("/quizzes");
      } finally {
        setLoading(false);
      }
    };

    void loadQuiz();
  }, [id, navigate]);

  const totalQuestions = quiz?.questions.length || 0;
  const currentQuestion: QuizQuestion | null = quiz?.questions[currentIndex] || null;

  const progressPercentage = useMemo(() => {
    if (!totalQuestions) return 0;
    return ((currentIndex + 1) / totalQuestions) * 100;
  }, [currentIndex, totalQuestions]);

  const score = useMemo(() => {
    if (!quiz) return 0;

    return quiz.questions.reduce((total, question, index) => {
      return answers[index] === question.correctIndex ? total + 1 : total;
    }, 0);
  }, [quiz, answers]);

  const submitQuiz = async () => {
    if (!quiz || !id) return;

    setSavingAttempt(true);

    try {
      const response = await saveQuizAttempt(id, {
        answers,
        score,
      });

      setSavedScore(response.score);
      setSubmitted(true);
      toast.success("Quiz submitted!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save attempt");
    } finally {
      setSavingAttempt(false);
    }
  };

  const resetQuiz = () => {
    if (!quiz) return;
    setAnswers(new Array(quiz.questions.length).fill(-1));
    setCurrentIndex(0);
    setSubmitted(false);
    setSavedScore(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  if (!quiz || totalQuestions === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <p className="text-gray-200">Quiz not found.</p>
          <button
            onClick={() => navigate("/quizzes")}
            className="mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-white font-semibold"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    const finalScore = savedScore ?? score;
    const percent = Math.round((finalScore / totalQuestions) * 100);

    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Quiz Results</h1>
          <p className="text-2xl text-blue-200 font-semibold">
            {finalScore}/{totalQuestions} - {percent}%
          </p>
        </div>

        <div className="space-y-4">
          {quiz.questions.map((question, index) => {
            const selectedAnswer = answers[index];
            const isCorrect = selectedAnswer === question.correctIndex;

            return (
              <div
                key={index}
                className={`rounded-2xl border p-5 ${
                  isCorrect
                    ? "border-green-400/40 bg-green-500/10"
                    : "border-red-400/40 bg-red-500/10"
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  {isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-300 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-300 mt-0.5" />
                  )}
                  <div>
                    <p className="text-white font-medium mb-2">
                      {index + 1}. {question.question}
                    </p>
                    <p className="text-sm text-gray-200">
                      Your answer: {selectedAnswer >= 0 ? OPTION_LABELS[selectedAnswer] : "Not answered"}
                    </p>
                    <p className="text-sm text-gray-200">
                      Correct answer: {OPTION_LABELS[question.correctIndex]}
                    </p>
                    <p className="text-sm text-gray-100 mt-2">
                      Explanation: {question.explanation}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={resetQuiz}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-white font-semibold"
          >
            Retake Quiz
          </button>
          <button
            onClick={() => navigate("/quizzes")}
            className="rounded-xl border border-white/20 px-5 py-2.5 text-white hover:bg-white/10"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
            <span>
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {currentQuestion && (
          <>
            <h2 className="text-2xl font-semibold text-white mb-6">
              {currentQuestion.question}
            </h2>

            <div className="space-y-3">
              {currentQuestion.options.map((option, optionIndex) => {
                const isSelected = answers[currentIndex] === optionIndex;

                return (
                  <button
                    key={optionIndex}
                    onClick={() => {
                      setAnswers((prev) => {
                        const next = [...prev];
                        next[currentIndex] = optionIndex;
                        return next;
                      });
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-blue-400/70 bg-blue-500/20 text-blue-100"
                        : "border-white/10 bg-white/5 text-gray-100 hover:bg-white/10"
                    }`}
                  >
                    <span className="font-semibold mr-2">{OPTION_LABELS[optionIndex]}.</span>
                    {option}
                  </button>
                );
              })}
            </div>

            <div className="mt-7 flex flex-wrap justify-between gap-3">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="rounded-xl border border-white/20 px-5 py-2.5 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {currentIndex === totalQuestions - 1 ? (
                <button
                  onClick={() => void submitQuiz()}
                  disabled={savingAttempt}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-white font-semibold disabled:opacity-50"
                >
                  {savingAttempt ? "Submitting..." : "Submit Quiz"}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-white font-semibold"
                >
                  Next Question
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default QuizAttempt;
