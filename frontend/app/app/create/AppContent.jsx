"use client";

import CreatePost from "../../components/CreatePost";

export default function AppContent({ userId }) {
    return (
        <div className="flex-1 px-10 py-8">
            <div className="max-w-[520px] mx-auto">
                <CreatePost userId={userId} />
            </div>
        </div>
    );
}