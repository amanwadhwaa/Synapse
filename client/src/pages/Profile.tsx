import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/auth";

export default function Profile() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/auth/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setProfile(data);
    };

    fetchProfile();
  }, []);

  return (
    <div style={{ padding: "24px" }}>
      <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
      <p className="text-gray-400 mb-6">Manage your account information</p>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 max-w-md">
        <div className="space-y-5">
          <div>
            <p className="text-gray-400 text-sm">Name</p>
            <p className="text-white font-medium">
              {profile?.name || user?.name}
            </p>
          </div>

          <div>
            <p className="text-gray-400 text-sm">Email</p>
            <p className="text-white font-medium">
              {profile?.email || user?.email}
            </p>
          </div>

          <div className="border-t border-white/10 pt-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition">
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
