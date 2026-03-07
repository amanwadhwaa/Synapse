import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, RotateCcw, Minimize2, Clock } from 'lucide-react';
import { usePomodoroStore, type PomodoroMode } from '../stores/pomodoro';

const PomodoroTimer: React.FC = () => {
  const {
    isMinimized,
    currentMode,
    timeRemaining,
    isRunning,
    sessionCount,
    selectedSubjectId,
    toggleMinimized,
    start,
    pause,
    reset,
    setSubject,
    tick,
  } = usePomodoroStore();

  const [subjects, setSubjects] = useState<any[]>([]);
  const intervalRef = useRef<number | null>(null);

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch('/api/subjects', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setSubjects(data);
        }
      } catch (error) {
        console.error('Failed to fetch subjects:', error);
      }
    };
    fetchSubjects();
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        tick();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, tick]);

  // Handle session end
  useEffect(() => {
    if (timeRemaining === 0) {
      playChime();
      showNotification();
      if (currentMode === 'work') {
        logSession();
      }
    }
  }, [timeRemaining, currentMode]);

  const playChime = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const showNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification(`${currentMode === 'work' ? 'Work' : 'Break'} session completed!`);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(`${currentMode === 'work' ? 'Work' : 'Break'} session completed!`);
        }
      });
    }
  };

  const logSession = async () => {
    if (selectedSubjectId) {
      try {
        await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            subjectId: selectedSubjectId,
            durationMinutes: 25,
            type: 'POMODORO',
          }),
        });
      } catch (error) {
        console.error('Failed to log session:', error);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeColor = (mode: PomodoroMode) => {
    switch (mode) {
      case 'work': return '#3b82f6';
      case 'shortBreak': return '#10b981';
      case 'longBreak': return '#f59e0b';
    }
  };

  const getTotalTime = (mode: PomodoroMode) => {
    switch (mode) {
      case 'work': return 25 * 60;
      case 'shortBreak': return 5 * 60;
      case 'longBreak': return 15 * 60;
    }
  };

  const progress = ((getTotalTime(currentMode) - timeRemaining) / getTotalTime(currentMode)) * 100;

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleMinimized}
          className="bg-[var(--color-primary)] hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-200"
        >
          <Clock className="h-6 w-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Pomodoro Timer</h3>
        <button
          onClick={toggleMinimized}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <Minimize2 className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col items-center">
        {/* Circular Progress */}
        <div className="relative mb-4">
          <svg width="120" height="120" className="transform -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke={getModeColor(currentMode)}
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - progress / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{formatTime(timeRemaining)}</div>
              <div className="text-sm text-gray-400 capitalize">{currentMode.replace('Break', ' Break')}</div>
            </div>
          </div>
        </div>

        {/* Subject Selector */}
        <select
          value={selectedSubjectId || ''}
          onChange={(e) => setSubject(e.target.value || null)}
          className="w-full mb-4 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
        >
          <option value="">Select Subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={isRunning ? pause : start}
            className="bg-[var(--color-primary)] hover:bg-blue-600 text-white p-3 rounded-full transition-colors"
          >
            {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button
            onClick={reset}
            className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>

        <div className="text-xs text-gray-400 mt-2">
          Sessions completed: {sessionCount}
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;