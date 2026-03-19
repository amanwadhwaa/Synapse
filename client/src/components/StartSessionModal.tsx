import { useEffect, useMemo, useState } from "react";
import { Brain, X } from "lucide-react";
import { apiRequest } from "../services/api";

interface Subject {
  id: string;
  name: string;
}

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (payload: { subjectId: string | null; durationMinutes: number }) => void;
}

const DURATION_PRESETS = [25, 45, 60, 90] as const;

export default function StartSessionModal({
  isOpen,
  onClose,
  onStart,
}: StartSessionModalProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<string>("");
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [selectedDuration, setSelectedDuration] = useState<number>(25);
  const [customDuration, setCustomDuration] = useState<string>("");

  const isCustom = selectedDuration === -1;
  const resolvedDuration = useMemo(() => {
    if (isCustom) {
      return Number(customDuration);
    }

    return selectedDuration;
  }, [isCustom, customDuration, selectedDuration]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSubjects = async () => {
      setLoadingSubjects(true);

      try {
        const data = await apiRequest("/subjects");
        setSubjects(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch subjects", error);
        setSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    };

    void fetchSubjects();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleStart = () => {
    if (!resolvedDuration || Number.isNaN(resolvedDuration) || resolvedDuration <= 0) {
      return;
    }

    onStart({
      subjectId: subjectId || null,
      durationMinutes: resolvedDuration,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg glass rounded-2xl p-6 shadow-2xl shadow-violet-900/20">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-9 w-9 inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-6 pr-12">
          <div className="relative">
            <Brain className="h-6 w-6 text-violet-400" />
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
          </div>
          <h2 className="font-serif text-2xl text-white">Start Study Session</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Subject
            </label>
            <select
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              disabled={loadingSubjects}
              className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
            >
              <option value="">General Study Session</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-sm font-medium text-neutral-300 mb-3">Duration</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {DURATION_PRESETS.map((duration) => (
                <button
                  key={duration}
                  type="button"
                  onClick={() => setSelectedDuration(duration)}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 ${
                    selectedDuration === duration
                      ? "bg-violet-500/20 border border-violet-400/40 text-violet-200 shadow-[0_0_15px_-5px_rgba(139,92,246,0.3)]"
                      : "bg-white/[0.02] border border-white/5 text-neutral-400 hover:bg-white/[0.05] hover:border-white/10"
                  }`}
                >
                  {duration} min
                </button>
              ))}

              <button
                type="button"
                onClick={() => setSelectedDuration(-1)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 ${
                  isCustom
                    ? "bg-violet-500/20 border border-violet-400/40 text-violet-200 shadow-[0_0_15px_-5px_rgba(139,92,246,0.3)]"
                    : "bg-white/[0.02] border border-white/5 text-neutral-400 hover:bg-white/[0.05] hover:border-white/10"
                }`}
              >
                Custom
              </button>
            </div>

            {isCustom && (
              <div className="mt-3">
                <input
                  type="number"
                  min={1}
                  value={customDuration}
                  onChange={(event) => setCustomDuration(event.target.value)}
                  placeholder="Enter minutes"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-5 py-2.5 text-neutral-300 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={!resolvedDuration || Number.isNaN(resolvedDuration) || resolvedDuration <= 0}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-white font-semibold shadow-lg shadow-violet-500/20 transition-all duration-300 hover:shadow-violet-500/35 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Session
          </button>
        </div>
      </div>
    </div>
  );
}
