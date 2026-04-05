"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "../../lib/config";
import { getAccessToken } from "../../lib/auth";
import { logout } from "../../logout/actions";

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? "bg-[#e91e8c]" : "bg-white/20"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingRow({ title, description, checked, onChange, saving }) {
  return (
    <div className="flex items-center justify-between gap-6 py-5">
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm">{title}</p>
        {description && (
          <p className="text-white/40 text-xs mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={saving} />
    </div>
  );
}

export default function SettingsContent({ userId }) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("privacy");

  const [isPrivate, setIsPrivate] = useState(false);
  const [messagesFollowersOnly, setMessagesFollowersOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getHeaders = () => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetch(`${API_URL}/api/users/${userId}/privacy`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setIsPrivate(!!data.is_private);
          setMessagesFollowersOnly(data.messages_privacy === "followers");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const updatePrivacy = async (patch) => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/users/${userId}/privacy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getHeaders() },
        body: JSON.stringify(patch),
      });
    } catch {}
    setSaving(false);
  };

  const handleIsPrivate = (val) => {
    setIsPrivate(val);
    updatePrivacy({ is_private: val });
  };

  const handleMessagesPrivacy = (val) => {
    setMessagesFollowersOnly(val);
    updatePrivacy({ messages_privacy: val ? "followers" : "everyone" });
  };

  const navItems = [
    { id: "privacy", label: "Account privacy" },
    { id: "account", label: "Account" },
  ];

  return (
    <div className="flex-1 flex overflow-hidden h-screen">
      {/* Left sidebar */}
      <div className="w-[260px] border-r border-white/10 flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-white/50 hover:text-white transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-semibold text-lg">Settings</h1>
        </div>

        <nav className="p-3 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition ${
                activeSection === item.id
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}

          <div className="mt-auto pt-4 border-t border-white/10 mt-4">
            <form action={logout}>
              <button
                type="submit"
                className="w-full text-left px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition font-medium"
              >
                Log out
              </button>
            </form>
          </div>
        </nav>
      </div>

      {/* Right content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-8 py-8">

          {activeSection === "privacy" && (
            <>
              <h2 className="text-white font-semibold text-xl mb-1">Account privacy</h2>
              <p className="text-white/40 text-sm mb-8">
                Control who can see your content and contact you.
              </p>

              <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-6 divide-y divide-white/10">
                {loading ? (
                  <div className="py-10 flex justify-center">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    <SettingRow
                      title="Private account"
                      description="When your account is private, only followers you approve can see your posts and profile. Your username and profile picture are still visible to everyone."
                      checked={isPrivate}
                      onChange={handleIsPrivate}
                      saving={saving}
                    />
                    <SettingRow
                      title="Restrict messages to followers"
                      description="When enabled, only people who follow you can send you direct messages. Others will not be able to start a conversation with you."
                      checked={messagesFollowersOnly}
                      onChange={handleMessagesPrivacy}
                      saving={saving}
                    />
                  </>
                )}
              </div>
            </>
          )}

          {activeSection === "account" && (
            <>
              <h2 className="text-white font-semibold text-xl mb-1">Account</h2>
              <p className="text-white/40 text-sm mb-8">
                Manage your account details.
              </p>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5">
                <p className="text-white/40 text-sm">
                  To update your username, email, bio, or profile picture, go to{" "}
                  <button
                    onClick={() => router.back()}
                    className="text-[#e91e8c] hover:underline"
                  >
                    your profile
                  </button>{" "}
                  and click <span className="text-white/70">Edit profile</span>.
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
