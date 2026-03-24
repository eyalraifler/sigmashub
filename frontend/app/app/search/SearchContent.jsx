"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { API_URL } from "../../lib/config";
import { getAccessToken } from "../../lib/auth";

// ─── Post Card (inline, reused from PostsFeed style) ──────────────────────────

function PostCard({ post, userId, onLike }) {
  const [mediaIndex, setMediaIndex] = useState(0);
  const [isFollowing, setIsFollowing] = useState(post.is_following ?? false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  const mediaList = post.media_items?.length
    ? post.media_items
    : [{ media_url: post.media_url, media_type: post.media_type }];
  const currentMedia = mediaList[mediaIndex];

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
      console.error("Follow error:", err);
    }
  };

  const handleLike = async () => {
    const token = getAccessToken();
    try {
      const res = await fetch(`${API_URL}/api/posts/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ post_id: post.id, user_id: userId }),
      });
      const data = await res.json();
      if (data.ok && onLike) onLike(post.id, data.liked);
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`${API_URL}/api/posts/${post.id}/comments`);
      const data = await res.json();
      if (data.ok) setComments(data.comments);
    } catch (err) {
      console.error("Comments error:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments) fetchComments();
    setShowComments((v) => !v);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const token = getAccessToken();
    try {
      const res = await fetch(`${API_URL}/api/posts/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ post_id: post.id, user_id: userId, content: commentText }),
      });
      const data = await res.json();
      if (data.ok) {
        setCommentText("");
        fetchComments();
      }
    } catch (err) {
      console.error("Comment error:", err);
    }
  };

  return (
    <div className="border border-white/10 bg-white/5 rounded-xl overflow-hidden mb-6">
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <Link href={`/app/${post.username}`} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {post.profile_image_url ? (
              <img src={`${API_URL}${post.profile_image_url}`} alt={post.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-semibold text-sm">{post.username[0].toUpperCase()}</span>
            )}
          </div>
          <span className="text-white font-semibold text-sm">{post.username}</span>
        </Link>
        {userId && post.user_id !== userId && (
          <button
            onClick={handleFollowToggle}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              isFollowing ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#e91e8c] text-white hover:bg-[#c4187a]"
            }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>

      {/* Media */}
      <div className="bg-black aspect-square relative overflow-hidden">
        {currentMedia.media_type === "image" ? (
          <img src={`${API_URL}${currentMedia.media_url}`} alt="Post" className="w-full h-full object-cover" />
        ) : (
          <video src={`${API_URL}${currentMedia.media_url}`} controls className="w-full h-full object-cover" />
        )}
        {mediaList.length > 1 && (
          <>
            <button
              onClick={() => setMediaIndex((i) => Math.max(0, i - 1))}
              disabled={mediaIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80 disabled:opacity-30"
            >
              <img src="/icons/chevron-sign-left.png" alt="prev" className="w-4 h-4" />
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
                <button key={i} onClick={() => setMediaIndex(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === mediaIndex ? "bg-white" : "bg-white/40"}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Actions + Caption + Tags */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-4 text-white/70">
          <button onClick={handleLike} className="flex items-center gap-1">
            <img
              src={post.is_liked_by_user ? "/icons/heart_red.png" : "/icons/heart_blanked - white.png"}
              alt="like"
              className="w-5 h-5 object-contain"
            />
            <span className="text-sm text-white">{post.likes_count}</span>
          </button>
          <button onClick={handleToggleComments} className="flex items-center gap-1">
            <img src="/icons/comment - white.png" alt="comments" className="w-5 h-5 object-contain" />
            <span className="text-sm text-white">{post.comments_count}</span>
          </button>
        </div>

        {post.caption && (
          <p className="text-white text-sm">
            <Link href={`/app/${post.username}`} className="font-semibold hover:underline">{post.username}</Link>{" "}
            {post.caption}
          </p>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.map((tag) => (
              <span key={tag} className="text-blue-400 text-sm">#{tag}</span>
            ))}
          </div>
        )}

        {showComments && (
          <div className="space-y-3 mt-2 pt-3 border-t border-white/10">
            {loadingComments ? (
              <p className="text-white/40 text-sm">Loading comments…</p>
            ) : comments.length === 0 ? (
              <p className="text-white/40 text-sm">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2 text-sm">
                  <Link href={`/app/${c.username}`} className="text-white font-semibold hover:underline flex-shrink-0">{c.username}</Link>
                  <span className="text-white/80">{c.content}</span>
                </div>
              ))
            )}
            {userId && (
              <form onSubmit={handleSubmitComment} className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm placeholder:text-white/30 outline-none focus:border-white/30"
                />
                <button type="submit" className="text-[#e91e8c] text-sm font-semibold hover:opacity-80">Post</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── User Card ────────────────────────────────────────────────────────────────

function UserCard({ user, userId }) {
  const [isFollowing, setIsFollowing] = useState(user.is_following ?? false);

  const handleFollowToggle = async () => {
    const token = getAccessToken();
    try {
      const res = await fetch(`${API_URL}/api/users/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ follower_id: userId, following_id: user.id }),
      });
      const data = await res.json();
      if (data.ok) setIsFollowing(data.following);
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border border-white/10 bg-white/5 rounded-xl">
      <Link href={`/app/${user.username}`} className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {user.profile_image_url ? (
            <img src={`${API_URL}${user.profile_image_url}`} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-semibold">{user.username[0].toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">@{user.username}</p>
          {user.bio && <p className="text-white/50 text-xs truncate">{user.bio}</p>}
        </div>
      </Link>
      {userId && user.id !== userId && (
        <button
          onClick={handleFollowToggle}
          className={`ml-3 flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition ${
            isFollowing ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#e91e8c] text-white hover:bg-[#c4187a]"
          }`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
}

// ─── Search Content ───────────────────────────────────────────────────────────

export default function SearchContent({ userId }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all" | "profiles" | "posts"
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const suggestDebounceRef = useRef(null);
  const inputRef = useRef(null);

  // Debounce the search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Fetch tag suggestions as user types
  useEffect(() => {
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    const raw = query.trim();
    if (!raw) {
      setTagSuggestions([]);
      return;
    }
    suggestDebounceRef.current = setTimeout(() => {
      fetch(`${API_URL}/api/tags/suggestions?q=${encodeURIComponent(raw)}`)
        .then((r) => r.json())
        .then((data) => { if (data.ok) setTagSuggestions(data.tags); })
        .catch(() => {});
    }, 200);
    return () => clearTimeout(suggestDebounceRef.current);
  }, [query]);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery) {
      setUsers([]);
      setPosts([]);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    const url = `${API_URL}/api/search?q=${encodeURIComponent(debouncedQuery)}${userId ? `&user_id=${userId}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setUsers(data.users);
          setPosts(data.posts);
        } else {
          setError("Search failed. Please try again.");
        }
      })
      .catch(() => setError("Could not connect to server."))
      .finally(() => setLoading(false));
  }, [debouncedQuery, userId]);

  const handleSelectTag = (tag) => {
    const newQuery = `#${tag}`;
    setQuery(newQuery);
    setDebouncedQuery(newQuery.trim());
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleLike = (postId, liked) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, is_liked_by_user: liked, likes_count: p.likes_count + (liked ? 1 : -1) }
          : p
      )
    );
  };

  const hasResults = users.length > 0 || posts.length > 0;
  const showEmpty = debouncedQuery && !loading && !hasResults && !error;

  const visibleUsers = activeTab === "posts" ? [] : users;
  const visiblePosts = activeTab === "profiles" ? [] : posts;

  return (
    <div className="max-w-[520px] mx-auto">
      {/* Search bar */}
      <div className="relative mb-6">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Search profiles, posts, or #tags…"
          autoFocus
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/30 text-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setDebouncedQuery(""); setTagSuggestions([]); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
          >
            ✕
          </button>
        )}

        {/* Tag suggestions dropdown */}
        {showSuggestions && tagSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-20 shadow-xl">
            {tagSuggestions.map(({ tag, post_count }) => (
              <button
                key={tag}
                onMouseDown={() => handleSelectTag(tag)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition text-left"
              >
                <span className="text-blue-400 text-sm font-medium">#{tag}</span>
                <span className="text-white/30 text-xs">{post_count} {post_count === 1 ? "post" : "posts"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs — only show when there are results */}
      {hasResults && (
        <div className="flex gap-2 mb-5">
          {[
            { id: "all", label: `All (${users.length + posts.length})` },
            { id: "profiles", label: `Profiles (${users.length})` },
            { id: "posts", label: `Posts (${posts.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === tab.id
                  ? "bg-[#e91e8c] text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-white/40 text-sm">Searching…</div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-8 text-red-400 text-sm">{error}</div>
      )}

      {/* Empty state */}
      {showEmpty && (
        <div className="text-center py-0 text-white/40 text-lg">
          <img src="/icons/no_results_icon.png" alt="No results" className="mx-auto mt-4 w-70 " />
          No results for &ldquo;{debouncedQuery}&rdquo;
        </div>
      )}

      {/* Idle state */}
      {!debouncedQuery && !loading && (
        <div className="text-center py-16 text-white/20 text-sm">
          Search for people, posts, or tags
        </div>
      )}

      {/* Users */}
      {visibleUsers.length > 0 && (
        <div className="mb-6">
          {activeTab === "all" && (
            <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Profiles</h2>
          )}
          <div className="space-y-2">
            {visibleUsers.map((user) => (
              <UserCard key={user.id} user={user} userId={userId} />
            ))}
          </div>
        </div>
      )}

      {/* Posts */}
      {visiblePosts.length > 0 && (
        <div>
          {activeTab === "all" && (
            <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Posts</h2>
          )}
          {visiblePosts.map((post) => (
            <PostCard key={post.id} post={post} userId={userId} onLike={handleLike} />
          ))}
        </div>
      )}
    </div>
  );
}
