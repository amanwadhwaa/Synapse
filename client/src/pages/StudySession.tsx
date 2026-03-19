import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function StudySession() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const minutes = Number(searchParams.get("time") || 0);

  const [timeLeft, setTimeLeft] = useState<number>(minutes * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert("Study session complete!");
          navigate("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  // ESC exits focus mode
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        navigate("/dashboard");
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  }, [navigate]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="h-screen w-full bg-[#030303] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="orb orb-violet w-[300px] h-[300px] top-1/4 left-1/4 opacity-15" style={{ animationDuration: '10s' }}></div>
      <div className="orb orb-cyan w-[200px] h-[200px] bottom-1/4 right-1/4 opacity-10" style={{ animationDuration: '14s' }}></div>

      <h1 className="relative text-white font-serif text-8xl md:text-9xl font-normal tracking-tightest" style={{ textShadow: '0 0 60px rgba(139,92,246,0.15)' }}>
        {formatTime(timeLeft)}
      </h1>

      <p className="relative text-neutral-500 mt-6 text-lg font-light">Focus Mode</p>

      <p className="relative text-neutral-700 text-sm mt-2">Press ESC to exit</p>
    </div>
  );
}
