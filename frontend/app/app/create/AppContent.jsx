"use client";

import CreatePost from "../../components/CreatePost";

export default function AppContent({ userId, username }) {
    return (
        <div className="flex-1 px-10 py-8">
            <CreatePost userId={userId} username={username} />
        </div>
    );
}
