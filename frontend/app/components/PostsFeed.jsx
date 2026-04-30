"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API_URL } from "../lib/config";
import { getAccessToken, getIsAdmin } from "../lib/auth";

/**
 * Renders a single post card with media carousel, likes, comments, and download.
 *
 * @param {Object} props
 * @param {Object} props.post - The post object from the API.
 * @param {number} props.userId - The logged-in user's ID (used for auth headers).
 * @param {Function} props.onLike - Callback invoked with (postId, liked) after a like toggle.
 * @param {Function} props.onComment - Callback invoked with (postId) after a comment is posted.
 * @returns {JSX.Element}
 */
function PostCard({ post, userId, isAdmin, onLike, onComment, onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [isFollowing, setIsFollowing] = useState(post.is_following ?? false);
  const [showMenu, setShowMenu] = useState(false);
  const [isSaved, setIsSaved] = useState(post.is_saved ?? false);

  /**
   * Toggle following the post's author and update the local follow state.
   */
  const handleSaveToggle = async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/posts/${post.id}/save`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setIsSaved(data.saved);
    } catch (err) {
      console.error("Failed to save post:", err);
    }
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post?")) return;
    const token = getAccessToken();
    try {
      const res = await fetch(`${API_URL}/api/posts/${post.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && onDelete) onDelete(post.id);
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
    setShowMenu(false);
  };

  const handleFollowToggle = async () => {
    const token = getAccessToken();
    try {
      const res = await fetch(`${API_URL}/api/users/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ follower_id: userId, following_id: post.user_id }),
      });
      const data = await res.json();
      if (data.ok) setIsFollowing(data.following);
    } catch (err) {
      console.error("Failed to toggle follow:", err);
    }
  };

  // Resolve media list: use media_items if available, fall back to single media_url
  const mediaList = post.media_items?.length
    ? post.media_items
    : [{ media_url: post.media_url, media_type: post.media_type }];
  const currentMedia = mediaList[mediaIndex];

  /**
   * Fetch the comments for this post from the API and update local state.
   */
  const fetchComments = async () => {
    setIsLoadingComments(true);
    try {
      const response = await fetch(
        `${API_URL}/api/posts/${post.id}/comments`
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

  /**
   * Show or hide the comments section. Fetches comments on first open.
   */
  const handleToggleComments = () => {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  /**
   * Submit the comment input to the API and refresh the comments list on success.
   *
   * @param {React.FormEvent} e - The form submit event.
   */
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const token = getAccessToken();

    try {
      const response = await fetch(`${API_URL}/api/posts/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          post_id: post.id,
          user_id: userId,
          content: commentText,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setCommentText("");
        setComments([]);
        fetchComments();
        if (onComment) onComment(post.id);
      }
    } catch (err) {
      console.error("Failed to submit comment:", err);
    }
  };

  /**
   * Download all media items in the post one by one via the /api/download proxy.
   * Each file is triggered as a browser download with a descriptive filename.
   */
  const handleDownload = async () => {
    for (let i = 0; i < mediaList.length; i++) {
      const media = mediaList[i];
      try {
        const res = await fetch(`/api/download?path=${encodeURIComponent(media.media_url)}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const ext = media.media_url.split(".").pop().split("?")[0];
        const a = document.createElement("a");
        a.href = url;
        a.download = `${post.username}_post_${post.id}_${i + 1}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Failed to download media:", err);
      }
    }
  };

  /**
   * Toggle the like on this post and notify the parent via onLike callback.
   */
  const handleLike = async () => {
    const token = getAccessToken();
    try {
      const response = await fetch(`${API_URL}/api/posts/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    <div className="border border-white/10 bg-white/5 rounded-xl overflow-hidden mb-6">
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <Link href={`/app/${post.username}`} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {post.profile_image_url ? (
              <img
                src={`${API_URL}${post.profile_image_url}`}
                alt={post.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-semibold text-sm">
                {post.username[0].toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-white font-semibold text-sm">{post.username}</span>
        </Link>
        <div className="flex items-center gap-3">
          {userId && post.user_id !== userId && (
            <button
              onClick={handleFollowToggle}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                isFollowing
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-[#e91e8c] text-white hover:bg-[#c4187a]"
              }`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="p-1 rounded hover:bg-white/10 transition"
            >
              <img src="/icons/three_dots_white.png" alt="more" className="w-5 h-5 object-contain" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-8 top-0 z-20 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden w-40">
                  {userId && (
                    <button
                      onClick={handleSaveToggle}
                      className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition flex items-center gap-2"
                    >
                      <img
                        src={isSaved ? "/icons/heart_red.png" : "/icons/heart_blanked - white.png"}
                        alt="save"
                        className="w-4 h-4 object-contain"
                      />
                      {isSaved ? "Unsave" : "Save"}
                    </button>
                  )}
                  {(isAdmin || post.user_id === userId) && (
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/10 transition flex items-center gap-2"
                    >
                      <span className="text-base">🗑</span>
                      Delete post
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Media */}
      <div className="bg-black aspect-square relative overflow-hidden">
        {currentMedia.media_type === "image" ? (
          <img
            src={`${API_URL}${currentMedia.media_url}`}
            alt="Post"
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            src={`${API_URL}${currentMedia.media_url}`}
            controls
            className="w-full h-full object-cover"
          />
        )}

        {/* Carousel controls */}
        {mediaList.length > 1 && (
          <>
            <button
              onClick={() => setMediaIndex((i) => Math.max(0, i - 1))}
              disabled={mediaIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80 disabled:opacity-30"
            >
              <img src="/icons/chevron-sign-left.png" alt="previous" className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMediaIndex((i) => Math.min(mediaList.length - 1, i + 1))}
              disabled={mediaIndex === mediaList.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80 disabled:opacity-30"
            >
              <img src="/icons/chevron-sign-right.png" alt="next" className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {mediaList.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setMediaIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === mediaIndex ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Actions + Caption + Tags */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-4 text-white/70">
          {/* Like */}
          <button onClick={handleLike} className="flex items-center gap-1">
            <img
              src={post.is_liked_by_user ? "/icons/heart_red.png" : "/icons/heart_blanked - white.png"}
              alt="like"
              className="w-5 h-5 object-contain"
            />
            <span className="text-sm text-white">{post.likes_count}</span>
          </button>
          {/* Comment */}
          <button onClick={handleToggleComments} className="flex items-center gap-1">
            <img src="/icons/comment - white.png" alt="comments" className="w-5 h-5 object-contain" />
            <span className="text-sm text-white">{post.comments_count}</span>
          </button>
          {/* Save */}
          <button onClick={handleDownload} className="flex items-center ml-auto hover:opacity-70 transition">
            <img src="/icons/download - white.png" alt="download" className="w-5 h-5 object-contain" />
          </button>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-white text-sm">
            <Link href={`/app/${post.username}`} className="font-semibold hover:underline">{post.username}</Link>{" "}
            {post.caption}
          </p>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.map((tag) => (
              <span key={tag} className="text-blue-400 text-sm">#{tag}</span>
            ))}
          </div>
        )}

        {/* Comments Section */}
        {showComments && (
          <div className="space-y-3 mt-2 pt-3 border-t border-white/10">
            {isLoadingComments ? (
              <div className="text-white/50 text-sm">Loading comments...</div>
            ) : comments.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2 text-sm">
                    <Link href={`/app/${comment.username}`} className="flex-shrink-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 overflow-hidden flex items-center justify-center">
                        {comment.profile_image_url ? (
                          <img src={`${API_URL}${comment.profile_image_url}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-semibold text-xs">{comment.username[0].toUpperCase()}</span>
                        )}
                      </div>
                    </Link>
                    <p>
                      <Link href={`/app/${comment.username}`} className="text-white font-semibold hover:underline">{comment.username}</Link>{" "}
                      <span className="text-white/80">{comment.content}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-white/50 text-sm">No comments yet</div>
            )}
            <form onSubmit={handleSubmitComment} className="flex gap-2">
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

/**
 * Renders the full post feed, fetching posts from the API.
 *
 * Re-fetches whenever userId or refreshTrigger changes.
 * Updates like counts and comment counts locally after user interactions
 * without needing a full re-fetch.
 *
 * @param {Object} props
 * @param {number} props.userId - The logged-in user's ID, used for like/follow state.
 * @param {*} props.refreshTrigger - Any value — changing it triggers a feed re-fetch.
 * @returns {JSX.Element}
 */
export default function PostsFeed({ userId, refreshTrigger, mode = "recent" }) {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(getIsAdmin());
  }, []);

  /**
   * Fetch the post feed from the API and update the posts state.
   */
  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const endpoint =
        mode === "for-you" && userId
          ? `${API_URL}/api/posts/for-you?user_id=${userId}`
          : userId
          ? `${API_URL}/api/posts/feed?user_id=${userId}`
          : `${API_URL}/api/posts/feed`;

      const response = await fetch(endpoint);
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

  /**
   * Update the like count and like state for a post in the local list.
   *
   * @param {number} postId - The ID of the post that was liked/unliked.
   * @param {boolean} liked - True if the post was just liked, false if unliked.
   */
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

  /**
   * Increment the comment count for a post in the local list.
   *
   * @param {number} postId - The ID of the post that received a new comment.
   */
  const handleComment = (postId) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? { ...post, comments_count: post.comments_count + 1 }
          : post
      )
    );
  };

  const handleDelete = (postId) => {
    setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postId));
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
          isAdmin={isAdmin}
          onLike={handleLike}
          onComment={handleComment}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
