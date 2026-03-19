import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Calendar,
  Pencil,
  BookOpen,
  Clock3,
  Trophy,
  Target,
  Plus,
  Trash2,
  Save,
  LogOut,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../stores/auth";
import { apiRequest } from "../services/api";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  institution?: string | null;
  grade?: string | null;
  language: string;
  createdAt: string;
}

interface Subject {
  id: string;
  name: string;
  examDate?: string | null;
}

interface Session {
  id: string;
  durationMinutes: number;
}

interface QuizStats {
  completedCount: number;
  averageScore: number;
}

const LANGUAGE_OPTIONS = [
  "english",
  "hindi",
  "tamil",
  "telugu",
  "kannada",
  "bengali",
  "marathi",
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [totalNotes, setTotalNotes] = useState(0);
  const [totalStudyHours, setTotalStudyHours] = useState(0);
  const [quizStats, setQuizStats] = useState<QuizStats>({
    completedCount: 0,
    averageScore: 0,
  });

  const [accountForm, setAccountForm] = useState({
    name: "",
    institution: "",
    grade: "",
  });

  const [preferencesForm, setPreferencesForm] = useState({
    language: "english",
    pomodoroWorkDuration: "25",
    pomodoroBreakDuration: "5",
  });

  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectExamDate, setNewSubjectExamDate] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);

  useEffect(() => {
    const loadProfilePage = async () => {
      setLoading(true);

      try {
        const [profileData, subjectsData, notesData, sessionsData, quizStatsData] =
          await Promise.all([
            apiRequest("/auth/profile"),
            apiRequest("/subjects"),
            apiRequest("/notes"),
            apiRequest("/sessions"),
            apiRequest("/quizzes/stats"),
          ]);

        const typedProfile = profileData as ProfileData;
        const typedSubjects = (subjectsData as Subject[]) || [];
        const typedNotes = (notesData as Array<{ id: string }>) || [];
        const typedSessions = (sessionsData as Session[]) || [];
        const typedQuizStats = quizStatsData as QuizStats;

        const totalMinutes = typedSessions.reduce(
          (sum, session) => sum + (session.durationMinutes || 0),
          0,
        );

        const savedPrefsRaw = localStorage.getItem("pomodoro-preferences");
        const savedPrefs = savedPrefsRaw
          ? (JSON.parse(savedPrefsRaw) as {
              workDuration?: number;
              breakDuration?: number;
            })
          : null;

        setProfile(typedProfile);
        setSubjects(typedSubjects);
        setTotalNotes(typedNotes.length);
        setTotalStudyHours(Math.round((totalMinutes / 60) * 10) / 10);
        setQuizStats(typedQuizStats);

        setAccountForm({
          name: typedProfile.name || "",
          institution: typedProfile.institution || "",
          grade: typedProfile.grade || "",
        });

        setPreferencesForm({
          language: typedProfile.language || "english",
          pomodoroWorkDuration: String(savedPrefs?.workDuration || 25),
          pomodoroBreakDuration: String(savedPrefs?.breakDuration || 5),
        });
      } catch (error) {
        console.error(error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    void loadProfilePage();
  }, []);

  const avatarInitial = useMemo(() => {
    const source = profile?.name || user?.name || "U";
    return source.trim().charAt(0).toUpperCase();
  }, [profile?.name, user?.name]);

  const memberSince = useMemo(() => {
    if (!profile?.createdAt) return "-";
    return new Date(profile.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [profile?.createdAt]);

  const handleSaveAccount = async () => {
    setSavingAccount(true);

    try {
      const updated = (await apiRequest("/auth/profile", "PUT", {
        name: accountForm.name,
        institution: accountForm.institution,
        grade: accountForm.grade,
      })) as ProfileData;

      setProfile(updated);
      toast.success("Account settings saved");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save account settings");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSavePreferences = async () => {
    const workDuration = Number(preferencesForm.pomodoroWorkDuration);
    const breakDuration = Number(preferencesForm.pomodoroBreakDuration);

    if (Number.isNaN(workDuration) || workDuration <= 0) {
      toast.error("Pomodoro work duration must be a valid number");
      return;
    }

    if (Number.isNaN(breakDuration) || breakDuration <= 0) {
      toast.error("Pomodoro break duration must be a valid number");
      return;
    }

    setSavingPreferences(true);

    try {
      const updated = (await apiRequest("/auth/profile", "PUT", {
        language: preferencesForm.language,
      })) as ProfileData;

      localStorage.setItem(
        "pomodoro-preferences",
        JSON.stringify({
          workDuration,
          breakDuration,
        }),
      );

      setProfile(updated);
      toast.success("Preferences saved");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save preferences");
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) {
      toast.error("Subject name is required");
      return;
    }

    setAddingSubject(true);

    try {
      const created = (await apiRequest("/subjects", "POST", {
        name: newSubjectName,
        examDate: newSubjectExamDate || null,
      })) as Subject;

      setSubjects((prev) => {
        const withoutDuplicate = prev.filter((subject) => subject.id !== created.id);
        return [...withoutDuplicate, created].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      });

      setNewSubjectName("");
      setNewSubjectExamDate("");
      toast.success("Subject added");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add subject");
    } finally {
      setAddingSubject(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    setDeletingSubjectId(subjectId);

    try {
      await apiRequest(`/subjects/${subjectId}`, "DELETE");
      setSubjects((prev) => prev.filter((subject) => subject.id !== subjectId));
      toast.success("Subject deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete subject");
    } finally {
      setDeletingSubjectId(null);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Profile Banner */}
        <section className="relative overflow-hidden rounded-3xl glass p-8">
          <div className="orb orb-violet w-52 h-52 -top-20 -right-10 opacity-20" style={{ animationDuration: '8s' }}></div>
          <div className="orb orb-cyan w-56 h-56 -bottom-24 left-24 opacity-15" style={{ animationDuration: '12s' }}></div>

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white text-4xl font-bold flex items-center justify-center shadow-xl shadow-violet-500/25">
                {avatarInitial}
              </div>

              <div>
                <h1 className="font-serif text-4xl text-white mb-1 tracking-tight">
                  {profile?.name || user?.name}
                </h1>
                <div className="flex items-center gap-2 text-neutral-300 mb-1">
                  <Mail className="h-4 w-4" />
                  <span>{profile?.email || user?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Member since {memberSince}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const settingsSection = document.getElementById("account-settings");
                settingsSection?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-white hover:bg-white/[0.06] transition-all duration-300"
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { icon: BookOpen, label: 'Total Notes', value: totalNotes, color: 'text-violet-300' },
            { icon: Clock3, label: 'Total Study Hours', value: totalStudyHours, color: 'text-cyan-300' },
            { icon: Trophy, label: 'Quizzes Completed', value: quizStats.completedCount, color: 'text-emerald-300' },
            { icon: Target, label: 'Average Score', value: `${quizStats.averageScore}%`, color: 'text-violet-300' },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                  <span className="text-xs text-neutral-500 uppercase tracking-widest">{stat.label.split(' ').pop()}</span>
                </div>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-neutral-500 mt-1">{stat.label}</p>
              </div>
            )
          })}
        </section>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section
            id="account-settings"
            className="glass-card rounded-2xl p-6"
          >
            <h2 className="font-serif text-2xl text-white mb-5">Account Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Name</label>
                <input
                  type="text"
                  value={accountForm.name}
                  onChange={(event) =>
                    setAccountForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300 mb-2">Email</label>
                <input
                  type="email"
                  value={profile?.email || user?.email || ""}
                  readOnly
                  className="w-full rounded-xl border border-white/5 bg-[#080808] px-4 py-3 text-neutral-400"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300 mb-2">Institution</label>
                <input
                  type="text"
                  value={accountForm.institution}
                  onChange={(event) =>
                    setAccountForm((prev) => ({
                      ...prev,
                      institution: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300 mb-2">Grade / Year</label>
                <input
                  type="text"
                  value={accountForm.grade}
                  onChange={(event) =>
                    setAccountForm((prev) => ({ ...prev, grade: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
                />
              </div>

              <button
                onClick={() => void handleSaveAccount()}
                disabled={savingAccount}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-white font-semibold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition-all duration-300 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingAccount ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>

          <section className="glass-card rounded-2xl p-6">
            <h2 className="font-serif text-2xl text-white mb-5">Preferences</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Preferred Language</label>
                <select
                  value={preferencesForm.language}
                  onChange={(event) =>
                    setPreferencesForm((prev) => ({
                      ...prev,
                      language: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
                >
                  {LANGUAGE_OPTIONS.map((language) => (
                    <option key={language} value={language}>
                      {language.charAt(0).toUpperCase() + language.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-300 mb-2">Pomodoro work duration (minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={preferencesForm.pomodoroWorkDuration}
                  onChange={(event) =>
                    setPreferencesForm((prev) => ({
                      ...prev,
                      pomodoroWorkDuration: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300 mb-2">Pomodoro break duration (minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={preferencesForm.pomodoroBreakDuration}
                  onChange={(event) =>
                    setPreferencesForm((prev) => ({
                      ...prev,
                      pomodoroBreakDuration: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
                />
              </div>

              <button
                onClick={() => void handleSavePreferences()}
                disabled={savingPreferences}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-white font-semibold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition-all duration-300 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingPreferences ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </section>
        </div>

        {/* Subjects */}
        <section className="glass-card rounded-2xl p-6">
          <h2 className="font-serif text-2xl text-white mb-5">Subjects</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
            <input
              type="text"
              value={newSubjectName}
              onChange={(event) => setNewSubjectName(event.target.value)}
              placeholder="Subject name"
              className="rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
            />
            <input
              type="date"
              value={newSubjectExamDate}
              onChange={(event) => setNewSubjectExamDate(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
            />
            <button
              onClick={() => void handleAddSubject()}
              disabled={addingSubject}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-3 text-white font-semibold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition-all duration-300 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {addingSubject ? "Adding..." : "Add New Subject"}
            </button>
          </div>

          {subjects.length === 0 ? (
            <p className="text-neutral-400 font-light">No subjects yet. Add your first subject above.</p>
          ) : (
            <div className="space-y-3">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="rounded-xl border border-white/5 bg-[#0a0a0a]/60 px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-medium">{subject.name}</p>
                    <p className="text-sm text-neutral-500">
                      Exam date:{" "}
                      {subject.examDate
                        ? new Date(subject.examDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "Not set"}
                    </p>
                  </div>

                  <button
                    onClick={() => void handleDeleteSubject(subject.id)}
                    disabled={deletingSubjectId === subject.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Danger Zone */}
        <section className="rounded-2xl border border-red-400/20 bg-red-500/5 backdrop-blur-xl p-6">
          <h2 className="font-serif text-xl text-red-200 mb-4">Danger Zone</h2>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 font-semibold transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </section>
      </div>
    </div>
  );
}
