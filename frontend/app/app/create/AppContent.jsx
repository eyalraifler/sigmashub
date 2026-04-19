"use client";

import CreatePost from "../../components/CreatePost";

export default function AppContent({ userId, username }) {
    return (
        <div className="flex-1 px-4 py-4 md:px-10 md:py-8">
            <CreatePost userId={userId} username={username} />
        </div>
    );
}
