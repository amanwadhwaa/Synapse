import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  Link,
  useLocation,
} from "react-router-dom";
import { Brain } from "lucide-react";
import { useAuthStore } from "./stores/auth";
import { useContentRejectionStore } from "./stores/contentRejection";
import toast, { Toaster } from "react-hot-toast";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import NoteDetail from "./pages/NoteDetail";
import StudyPlanner from "./pages/StudyPlanner";
import Layout from "./components/Layout";
import StudySession from "./pages/StudySession";
import Profile from "./pages/Profile";
import Quizzes from "./pages/Quizzes";
import QuizAttempt from "./pages/QuizAttempt";
import Performance from "./pages/Performance";
import GlobalChatbot from "./components/GlobalChatbot";
import ContentRejectionModal from "./components/ContentRejectionModal";

// Basic auth pages (will be enhanced later)
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] relative overflow-hidden px-6 py-10 flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20"></div>
      <div className="absolute -top-24 -left-12 w-80 h-80 bg-blue-500/12 rounded-full blur-3xl"></div>
      <div className="absolute top-1/3 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

      <div className="relative w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-blue-900/20">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="relative mb-3">
            <Brain className="h-10 w-10 text-[var(--color-primary)]" />
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[var(--color-primary)] animate-pulse"></div>
          </div>
          <span className="text-2xl font-bold tracking-wide bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            SYNAPSE
          </span>
          <h2 className="mt-3 text-3xl font-extrabold bg-gradient-to-r from-blue-300 via-white to-cyan-300 bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-300">Sign in to continue your learning journey.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white placeholder:text-white/50 focus:border-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white placeholder:text-white/50 focus:border-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
            required
          />
          <button
            type="submit"
            className="group w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 font-semibold shadow-lg shadow-blue-500/30 transition-all duration-200 hover:from-blue-500 hover:to-cyan-400 hover:shadow-blue-500/45 hover:scale-[1.01]"
          >
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-300">
          New to SYNAPSE?{" "}
          <Link
            to="/register"
            className="font-semibold text-blue-300 hover:text-blue-200 transition-colors"
          >
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
};

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(name, email, password);
      toast.success("Registration successful!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Registration failed",
      );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] relative overflow-hidden px-6 py-10 flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20"></div>
      <div className="absolute -top-24 -left-12 w-80 h-80 bg-blue-500/12 rounded-full blur-3xl"></div>
      <div className="absolute top-1/3 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

      <div className="relative w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-blue-900/20">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="relative mb-3">
            <Brain className="h-10 w-10 text-[var(--color-primary)]" />
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[var(--color-primary)] animate-pulse"></div>
          </div>
          <span className="text-2xl font-bold tracking-wide bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            SYNAPSE
          </span>
          <h2 className="mt-3 text-3xl font-extrabold bg-gradient-to-r from-blue-300 via-white to-cyan-300 bg-clip-text text-transparent">
            Join SYNAPSE
          </h2>
          <p className="mt-2 text-sm text-gray-300">Create your account and start learning smarter.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white placeholder:text-white/50 focus:border-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white placeholder:text-white/50 focus:border-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white placeholder:text-white/50 focus:border-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
            required
          />
          <button
            type="submit"
            className="group w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 font-semibold shadow-lg shadow-blue-500/30 transition-all duration-200 hover:from-blue-500 hover:to-cyan-400 hover:shadow-blue-500/45 hover:scale-[1.01]"
          >
            Create Account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-300">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-blue-300 hover:text-blue-200 transition-colors"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// Chatbot container with auth and route checks
const ChatbotContainer = () => {
  const { user } = useAuthStore();
  const location = useLocation();

  // Don't show on auth pages or landing page
  const isAuthPage = ["/", "/login", "/register"].includes(location.pathname);

  if (!user || isAuthPage) return null;
  return <GlobalChatbot />;
};

function App() {
  const { isRejectionModalOpen, closeRejectionModal } =
    useContentRejectionStore();

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <Layout>
                <Notes />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <NoteDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/planner"
          element={
            <ProtectedRoute>
              <Layout>
                <StudyPlanner />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quizzes"
          element={
            <ProtectedRoute>
              <Layout>
                <Quizzes />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quizzes/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <QuizAttempt />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/performance"
          element={
            <ProtectedRoute>
              <Layout>
                <Performance />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/study-session" element={<StudySession />} />
        <Route
          path="/profile"
          element={
            <Layout>
              <Profile />
            </Layout>
          }
        />
      </Routes>
      <ChatbotContainer />
      <ContentRejectionModal
        isOpen={isRejectionModalOpen}
        onClose={closeRejectionModal}
      />
    </Router>
  );
}

export default App;
