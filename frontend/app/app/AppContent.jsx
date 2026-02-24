"use client";

import { useState } from "react";
import CreatePost from "../components/CreatePost";
import PostsFeed from "../components/PostsFeed";

export default function AppContent({ userId }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePostCreated = () => {
    // Trigger feed refresh
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div>
      <CreatePost userId={userId} onPostCreated={handlePostCreated} />
      <PostsFeed userId={userId} refreshTrigger={refreshTrigger} />
    </div>
  );
}
