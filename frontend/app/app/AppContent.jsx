"use client";

import PostsFeed from "../components/PostsFeed";

export default function AppContent({ userId }) {
  return <PostsFeed userId={userId} mode="for-you" />;
}
