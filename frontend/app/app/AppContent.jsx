"use client";

import { useState } from "react";
import CreatePost from "../components/CreatePost";
import PostsFeed from "../components/PostsFeed";

const TABS = [
  { id: "for-you", label: "For You" },
  { id: "recent", label: "Recent" },
];

export default function AppContent({ userId }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("for-you");

  const handlePostCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div>
      <CreatePost userId={userId} onPostCreated={handlePostCreated} />

      {/* Feed tabs */}
      <div className="flex border-b border-white/10 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-sm font-semibold tracking-wide transition border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-[#e91e8c] text-white"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <PostsFeed
        key={activeTab}
        userId={userId}
        refreshTrigger={refreshTrigger}
        mode={activeTab}
      />
    </div>
  );
}
