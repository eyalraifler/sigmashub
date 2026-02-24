"use client";

import { useState, useEffect } from "react";

function PostCard({ post, userId, onLike, onComment }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const fetchComments = async () => {
    if (comments.length > 0) return; // Already loaded

    setIsLoadingComments(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/posts/${post.id}/comments`
      );
      const data = await response.json();
      if (data.ok) {
        setComments(data.comments);
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const response = await fetch("http://localhost:8000/api/posts/comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_id: post.id,
          user_id: userId,
          comment_text: commentText,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setCommentText("");
        // Refresh comments
        fetchComments();
        if (onComment) onComment(post.id);
      }
    } catch (err) {
      console.error("Failed to submit comment:", err);
    }
  };

  const handleLike = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/posts/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_id: post.id,
          user_id: userId,
        }),
      });

      const data = await response.json();
      if (data.ok && onLike) {
        onLike(post.id, data.liked);
      }
    } catch (err) {
      console.error("Failed to like post:", err);
    }
  };

  return (
    <div className="border border-white/10 bg-white/5 rounded-lg overflow-hidden mb-6">
      {/* Post Header */}
      <div className="p-4 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          {post.profile_image_url ? (
            <img
              src={`http://localhost:8000${post.profile_image_url}`}
              alt={post.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-white font-semibold">
              {post.username[0].toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <div className="text-white font-semibold">{post.username}</div>
          <div className="text-white/50 text-sm">
            {new Date(post.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Post Media */}
      <div className="bg-black">
        {post.media_type === "image" ? (
          <img
            src={`http://localhost:8000${post.media_url}`}
            alt="Post"
            className="w-full h-auto max-h-[600px] object-contain"
          />
        ) : (
          <video
            src={`http://localhost:8000${post.media_url}`}
            controls
            className="w-full h-auto max-h-[600px]"
          />
        )}
      </div>

      {/* Post Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-1 ${
              post.is_liked_by_user ? "text-red-500" : "text-white"
            } hover:text-red-500 transition-colors`}
          >
            <svg
              className="w-6 h-6"
              fill={post.is_liked_by_user ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span>{post.likes_count}</span>
          </button>

          <button
            onClick={handleToggleComments}
            className="flex items-center space-x-1 text-white hover:text-blue-500 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>{post.comments_count}</span>
          </button>
        </div>

        {/* Caption */}
        {post.caption && (
          <div className="text-white">
            <span className="font-semibold">{post.username}</span>{" "}
            {post.caption}
          </div>
        )}

        {/* Comments Section */}
        {showComments && (
          <div className="space-y-3 mt-4 pt-4 border-t border-white/10">
            {isLoadingComments ? (
              <div className="text-white/50 text-sm">Loading comments...</div>
            ) : comments.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="text-sm">
                    <span className="text-white font-semibold">
                      {comment.username}
                    </span>{" "}
                    <span className="text-white/80">{comment.comment_text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-white/50 text-sm">No comments yet</div>
            )}

            {/* Add Comment Form */}
            <form onSubmit={handleSubmitComment} className="flex space-x-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                Post
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostsFeed({ userId, refreshTrigger }) {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const url = userId
        ? `http://localhost:8000/api/posts/feed?user_id=${userId}`
        : "http://localhost:8000/api/posts/feed";

      const response = await fetch(url);
      const data = await response.json();

      if (data.ok) {
        setPosts(data.posts);
      } else {
        throw new Error("Failed to fetch posts");
      }
    } catch (err) {
      setError(err.message || "Failed to load posts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [userId, refreshTrigger]);

  const handleLike = (postId, liked) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              is_liked_by_user: liked,
              likes_count: liked ? post.likes_count + 1 : post.likes_count - 1,
            }
          : post
      )
    );
  };

  const handleComment = (postId) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? { ...post, comments_count: post.comments_count + 1 }
          : post
      )
    );
  };

  if (isLoading) {
    return (
      <div className="text-white/50 text-center py-8">Loading posts...</div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="text-white/50 text-center py-8">
        No posts yet. Be the first to post!
      </div>
    );
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          userId={userId}
          onLike={handleLike}
          onComment={handleComment}
        />
      ))}
    </div>
  );
}
