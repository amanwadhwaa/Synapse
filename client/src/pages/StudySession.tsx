import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { apiRequest } from "../services/api";

const MOTIVATIONAL_MESSAGES = [
  "You've got this! Stay focused!",
  "Every minute counts toward your success",
  "The best time to focus was yesterday, the second best is now",
  "Keep going! You're making progress!",
  "Consistency is the key to mastery",
  "Your future self will thank you",
  "Focus on the process, not the outcome",
  "You are capable of amazing things",
];

export default function StudySession() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const minutes = Number(searchParams.get("time") || 0);
  const subjectId = searchParams.get("subject") || null;
  const subjectName = searchParams.get("subjectName") || "General Study";

  const [timeLeft, setTimeLeft] = useState<number>(minutes * 60);
  const [isInFullscreen, setIsInFullscreen] = useState(false);
  const [showQuitWarning, setShowQuitWarning] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [quitConfirmInput, setQuitConfirmInput] = useState("");
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [pausesRemaining, setPausesRemaining] = useState(2);
  const [isPauseOverrideActive, setIsPauseOverrideActive] = useState(false);
  const [motivationalMessage] = useState(
    MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)],
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fullscreenCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visibilityBeepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasLeftTabDuringSessionRef = useRef(false);

  const playAlertSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const stopVisibilityBeeping = () => {
    if (visibilityBeepRef.current) {
      clearInterval(visibilityBeepRef.current);
      visibilityBeepRef.current = null;
    }
  };

  const startVisibilityBeeping = () => {
    if (visibilityBeepRef.current || isPauseOverrideActive) {
      return;
    }

    visibilityBeepRef.current = setInterval(() => {
      if (document.hidden && !isPauseOverrideActive) {
        playAlertSound();
      }
    }, 1500);
  };

  const requestFullscreen = async () => {
    if (isPauseOverrideActive) {
      return;
    }

    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen && !document.fullscreenElement) {
        await elem.requestFullscreen();
        setIsInFullscreen(true);
      }
    } catch (error) {
      console.error("Fullscreen request failed:", error);
    }
  };

  const checkFullscreen = () => {
    if (isPauseOverrideActive) {
      return;
    }

    if (!document.fullscreenElement && isInFullscreen) {
      playAlertSound();
      toast.error("Fullscreen mode exited. Please return to fullscreen.", {
        id: "fullscreen-warning",
        duration: 1400,
        position: "top-right",
      });
      setTimeout(() => {
        void requestFullscreen();
      }, 300);
    }
  };

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isPauseOverrideActive) {
      return;
    }

    e.preventDefault();
    e.returnValue = "Are you sure? Your study session is still active";
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isPauseOverrideActive) {
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      playAlertSound();
      toast.error("Nice try! Use End Session if you really want to quit.", {
        duration: 2500,
      });
    }
  };

  const handleVisibilityChange = () => {
    if (isPauseOverrideActive) {
      stopVisibilityBeeping();
      return;
    }

    if (document.hidden) {
      hasLeftTabDuringSessionRef.current = true;
      playAlertSound();
      startVisibilityBeeping();
      return;
    }

    stopVisibilityBeeping();

    if (hasLeftTabDuringSessionRef.current) {
      toast.error("You left your study session!", {
        duration: 3000,
      });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const logSessionCompletion = async () => {
    try {
      await apiRequest("/sessions", "POST", {
        subjectId,
        durationMinutes: minutes,
        type: "MANUAL",
      });
    } catch (error) {
      console.error("Failed to log session:", error);
    }
  };

  const activatePauseOverride = async () => {
    if (isPauseOverrideActive || pausesRemaining <= 0) {
      return;
    }

    setIsPauseOverrideActive(true);
    setPausesRemaining((prev) => prev - 1);
    stopVisibilityBeeping();

    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.error("Failed to exit fullscreen for pause:", error);
      }
    }

    toast.success("Pause override active. Restrictions are temporarily disabled.");
  };

  const resumeAfterPause = async () => {
    setIsPauseOverrideActive(false);
    await requestFullscreen();
    toast.success("Focus mode resumed.");
  };

  const handleQuitAttempt = () => {
    if (quitConfirmInput.trim() === "I QUIT") {
      navigate("/dashboard");
      return;
    }

    toast.error('Type exactly "I QUIT" to confirm');
  };

  useEffect(() => {
    void requestFullscreen();
  }, []);

  useEffect(() => {
    if (sessionCompleted || isPauseOverrideActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setSessionCompleted(true);
          void logSessionCompletion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sessionCompleted, isPauseOverrideActive]);

  useEffect(() => {
    if (sessionCompleted || isPauseOverrideActive) {
      if (fullscreenCheckRef.current) {
        clearInterval(fullscreenCheckRef.current);
        fullscreenCheckRef.current = null;
      }
      return;
    }

    fullscreenCheckRef.current = setInterval(checkFullscreen, 1200);
    return () => {
      if (fullscreenCheckRef.current) {
        clearInterval(fullscreenCheckRef.current);
        fullscreenCheckRef.current = null;
      }
    };
  }, [isInFullscreen, sessionCompleted, isPauseOverrideActive]);

  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopVisibilityBeeping();
    };
  }, [isPauseOverrideActive]);

  useEffect(() => {
    if (!sessionCompleted) {
      return;
    }

    stopVisibilityBeeping();

    const finishTimeout = setTimeout(() => {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      }
      navigate("/dashboard");
    }, 5000);

    return () => clearTimeout(finishTimeout);
  }, [sessionCompleted, navigate]);

  if (sessionCompleted) {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-green-900 via-black to-green-950 flex flex-col items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                opacity: Math.random() * 0.7 + 0.3,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-5xl font-bold text-green-400 mb-4">Study Session Complete!</h1>
          <p className="text-2xl text-green-300 mb-8">{minutes} minutes of focused learning</p>

          <div className="bg-white/10 backdrop-blur-sm border border-green-400/30 rounded-xl p-8 mb-8 max-w-md">
            <p className="text-lg text-green-200 mb-2">Subject</p>
            <p className="text-3xl font-bold text-white mb-6">{subjectName}</p>
            <p className="text-green-300">Great job staying focused!</p>
          </div>

          <p className="text-gray-300 text-sm animate-pulse">Redirecting to dashboard in 5 seconds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gradient-to-b from-slate-950 via-black to-slate-900 flex flex-col items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="absolute top-6 left-6 z-20 flex flex-col gap-3 w-80 max-w-[90vw]">
        {!showQuitWarning && !showQuitConfirm && (
          <button
            onClick={() => setShowQuitWarning(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-lg text-sm w-fit"
          >
            End Session Early
          </button>
        )}

        {showQuitWarning && !showQuitConfirm && (
          <div className="bg-red-950/85 backdrop-blur-sm border border-red-400/50 rounded-lg p-4">
            <p className="text-red-300 font-semibold mb-2">Real Talk</p>
            <p className="text-red-100 text-sm mb-3">
              You have <span className="font-bold text-white">{formatTime(timeLeft)}</span> remaining.
              Quitting now will <span className="text-red-300 font-bold">break your streak!</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowQuitWarning(false)}
                className="flex-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white py-2 text-sm"
              >
                Keep Studying
              </button>
              <button
                onClick={() => {
                  setShowQuitWarning(false);
                  setShowQuitConfirm(true);
                }}
                className="flex-1 rounded-md bg-red-600 hover:bg-red-700 text-white py-2 text-sm font-semibold"
              >
                Continue Quit
              </button>
            </div>
          </div>
        )}

        {showQuitConfirm && (
          <div className="bg-red-950/70 backdrop-blur-sm border border-red-400/50 rounded-lg p-4">
            <p className="text-red-300 font-bold mb-2 text-sm">Type "I QUIT" to confirm</p>
            <input
              type="text"
              value={quitConfirmInput}
              onChange={(e) => setQuitConfirmInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleQuitAttempt();
                }
              }}
              placeholder="I QUIT"
              className="w-full px-3 py-2 bg-slate-900 border border-red-400/50 rounded-lg text-white placeholder-gray-500 mb-3 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowQuitConfirm(false);
                  setShowQuitWarning(true);
                  setQuitConfirmInput("");
                }}
                className="flex-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white py-2 text-sm"
              >
                Back
              </button>
              <button
                onClick={handleQuitAttempt}
                className="flex-1 rounded-md bg-red-600 hover:bg-red-700 text-white py-2 text-sm font-bold"
              >
                Confirm
              </button>
            </div>
          </div>
        )}

        <div className="bg-black/40 border border-white/15 rounded-lg p-3">
          <p className="text-xs text-gray-300 mb-2">Pause Overrides Left: {pausesRemaining}</p>
          {!isPauseOverrideActive ? (
            <button
              onClick={() => void activatePauseOverride()}
              disabled={pausesRemaining <= 0}
              className="w-full py-2 rounded-md bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-semibold shadow-md"
            >
              Take Pause Override
            </button>
          ) : (
            <button
              onClick={() => void resumeAfterPause()}
              className="w-full py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-md"
            >
              Resume Focus Mode
            </button>
          )}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="mb-8 text-center">
          <p className="text-gray-400 text-lg mb-2">Currently studying</p>
          <h2 className="text-4xl font-bold text-blue-300">{subjectName}</h2>
        </div>

        <div className="mb-12 text-center">
          <h1
            className={`text-9xl font-black tracking-tighter drop-shadow-lg ${
              isPauseOverrideActive ? "text-amber-300" : "text-white"
            }`}
          >
            {formatTime(timeLeft)}
          </h1>
          {isPauseOverrideActive && (
            <p className="mt-3 text-amber-300 font-bold">Pause Override Active (Restrictions Disabled)</p>
          )}
          <div className="mt-4 h-1 w-96 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
              style={{
                width: `${((minutes * 60 - timeLeft) / (minutes * 60)) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="mb-12 max-w-lg text-center px-4">
          <p className="text-2xl font-semibold text-emerald-300 italic">"{motivationalMessage}"</p>
        </div>

        <p className="mt-6 text-gray-500 text-sm text-center max-w-md px-4">
          Fullscreen and tab detection are enforced unless a pause override is active.
        </p>
      </div>
    </div>
  );
}
