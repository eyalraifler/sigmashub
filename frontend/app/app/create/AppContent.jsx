import { useState } from "react";
import { useActionState } from "react";
import CreatePost from "../components/CreatePost";

export default function AppContent({ createPostAction }) {

    return (
        <div>
            <CreatePost createPostAction={createPostAction} />
        </div>
    )
}