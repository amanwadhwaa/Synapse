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
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center">
      <h1 className="text-white text-8xl font-bold">{formatTime(timeLeft)}</h1>

      <p className="text-gray-500 mt-6 text-lg">Focus Mode</p>

      <p className="text-gray-600 text-sm mt-2">Press ESC to exit</p>
    </div>
  );
}
