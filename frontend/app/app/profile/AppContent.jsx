"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { API_URL } from "../../lib/config";

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditProfileModal({ profile, userId, onClose, onSaved }) {
  const [username, setUsername] = useState(profile.username);
  const [email, setEmail] = useState(profile.email || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [previewImage, setPreviewImage] = useState(
    profile.profile_image_url ? `${API_URL}${profile.profile_image_url}` : null
  );
  const [imageData, setImageData] = useState(null); // base64 or path if changed
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewImage(ev.target.result);
      setImageData(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const body = { user_id: userId, username, email, bio };
      if (imageData) body.profile_image = imageData;

      const res = await fetch(`${API_URL}/api/users/${userId}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.detail || "Failed to save");
        return;
      }
      onSaved(data.user);
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-white/10 rounded-xl w-[420px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-white font-semibold text-base">Edit profile</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <img src="/icons/close - white.png" alt="close" className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 overflow-hidden flex items-center justify-center cursor-pointer relative group"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewImage ? (
                <img src={previewImage} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <img
                  src="/icons/sigma_male_user_image.png"
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <img src="/icons/upload_image - white.png" alt="change" className="w-6 h-6" />
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-[#e91e8c] hover:underline"
            >
              Change photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Username */}
          <div>
            <label className="text-white/60 text-xs mb-1 block">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={32}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-white/60 text-xs mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-white/60 text-xs mb-1 block">
              Bio{" "}
              <span className={bio.length > 180 ? "text-red-400" : "text-white/30"}>
                {bio.length}/200
              </span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Write something about yourself..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/30 resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-white/10 text-white rounded-lg text-sm font-semibold hover:bg-white/20 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 bg-[#e91e8c] text-white rounded-lg text-sm font-semibold hover:bg-[#c4187a] transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Followers / Following modal ──────────────────────────────────────────────

function UserListModal({ title, users, currentUserId, onClose, onFollowToggle }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-white/10 rounded-xl w-[360px] max-h-[500px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <img src="/icons/close - white.png" alt="close" className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto">
          {users.length === 0 ? (
            <p className="text-white/50 text-sm text-center py-10">
              No {title.toLowerCase()} yet
            </p>
          ) : (
            users.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {user.profile_image_url ? (
                      <img
                        src={`${API_URL}${user.profile_image_url}`}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {user.username[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-white font-medium text-sm">{user.username}</span>
                </div>
                {user.user_id !== currentUserId && (
                  <button
                    onClick={() => onFollowToggle(user.user_id)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                      user.is_following
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "bg-[#e91e8c] text-white hover:bg-[#c4187a]"
                    }`}
                  >
                    {user.is_following ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Post viewer modal ────────────────────────────────────────────────────────

function PostViewerModal({ posts, startIndex, userId, onClose, onLikeUpdate, onCommentUpdate }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  // per-post overrides so like state is live without mutating the array
  const [likeOverrides, setLikeOverrides] = useState({});

  const post = posts[currentIndex];
  const likeState = likeOverrides[post.id] ?? {
    liked: post.is_liked_by_user,
    count: post.likes_count,
  };

  const mediaList = post.media_items?.length
    ? post.media_items
    : [{ media_url: post.media_url, media_type: post.media_type }];
  const currentMedia = mediaList[mediaIndex];

  const fetchComments = async (postId) => {
    setIsLoadingComments(true);
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/comments`);
      const data = await res.json();
      if (data.ok) setComments(data.comments);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  useEffect(() => {
    setMediaIndex(0);
    setComments([]);
    setCommentText("");
    fetchComments(posts[currentIndex].id);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) goTo(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < posts.length - 1) goTo(currentIndex + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, posts.length]);

  const goTo = (index) => {
    setCurrentIndex(index);
  };

  const handleLike = async () => {
    try {
      const res = await fetch(`${API_URL}/api/posts/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id, user_id: userId }),
      });
      const data = await res.json();
      if (data.ok) {
        const newLiked = data.liked;
        const newCount = newLiked ? likeState.count + 1 : likeState.count - 1;
        setLikeOverrides((prev) => ({
          ...prev,
          [post.id]: { liked: newLiked, count: newCount },
        }));
        onLikeUpdate?.(post.id, newLiked, newCount);
      }
    } catch (err) {
      console.error("Failed to like:", err);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/posts/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id, user_id: userId, content: commentText }),
      });
      const data = await res.json();
      if (data.ok) {
        setCommentText("");
        fetchComments(post.id);
        onCommentUpdate?.(post.id);
      }
    } catch (err) {
      console.error("Failed to comment:", err);
    }
  };

  const cardHeight = "min(620px, 88vh)";
  const cardWidth = "min(900px, 88vw)";

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)" }}
      className="flex items-center justify-center"
      onClick={onClose}
    >
      {/* Prev arrow */}
      {currentIndex > 0 && (
        <button
          style={{ position: "absolute", left: 20, zIndex: 10 }}
          onClick={(e) => { e.stopPropagation(); goTo(currentIndex - 1); }}
          className="text-white bg-black/60 hover:bg-black/90 rounded-full w-10 h-10 flex items-center justify-center transition"
        >
          <img src="/icons/chevron-sign-left.png" alt="prev" className="w-5 h-5" />
        </button>
      )}

      {/* Card */}
      <div
        style={{ width: cardWidth, height: cardHeight, display: "flex" }}
        className="bg-[#111] border border-white/10 rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left – media (square crop) */}
        <div style={{ width: "55%", flexShrink: 0, position: "relative" }} className="bg-black flex items-center justify-center">
          {currentMedia.media_type === "image" ? (
            <img
              src={`${API_URL}${currentMedia.media_url}`}
              alt=""
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              src={`${API_URL}${currentMedia.media_url}`}
              controls
              className="w-full h-full object-contain"
            />
          )}
          {/* Carousel dots + arrows */}
          {mediaList.length > 1 && (
            <>
              <button
                onClick={() => setMediaIndex((i) => Math.max(0, i - 1))}
                disabled={mediaIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80 disabled:opacity-30"
              >
                <img src="/icons/chevron-sign-left.png" alt="" className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMediaIndex((i) => Math.min(mediaList.length - 1, i + 1))}
                disabled={mediaIndex === mediaList.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80 disabled:opacity-30"
              >
                <img src="/icons/chevron-sign-right.png" alt="" className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
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

        {/* Right – info panel */}
        <div style={{ width: "45%", display: "flex", flexDirection: "column", height: "100%" }} className="border-l border-white/10">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
            <Link href={`/app/${post.username}`} onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 overflow-hidden flex items-center justify-center flex-shrink-0">
                {post.profile_image_url ? (
                  <img src={`${API_URL}${post.profile_image_url}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-semibold text-sm">{post.username[0].toUpperCase()}</span>
                )}
              </div>
              <span className="text-white font-semibold text-sm">{post.username}</span>
            </Link>
            <button onClick={onClose} className="text-white/40 hover:text-white transition flex-shrink-0">
              <img src="/icons/close - white.png" alt="close" className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable: caption + tags + comments */}
          <div style={{ flex: 1, overflowY: "auto" }} className="px-4 py-3 space-y-3">
            {post.caption && (
              <p className="text-sm">
                <Link href={`/app/${post.username}`} onClick={onClose} className="text-white font-semibold hover:underline">{post.username}</Link>{" "}
                <span className="text-white/80">{post.caption}</span>
              </p>
            )}
            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.tags.map((tag) => (
                  <span key={tag} className="text-blue-400 text-sm">#{tag}</span>
                ))}
              </div>
            )}
            {isLoadingComments ? (
              <p className="text-white/40 text-sm">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-white/40 text-sm">No comments yet</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2 text-sm">
                  <Link href={`/app/${c.username}`} onClick={onClose} className="flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 overflow-hidden flex items-center justify-center">
                      {c.profile_image_url ? (
                        <img src={`${API_URL}${c.profile_image_url}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold text-xs">{c.username[0].toUpperCase()}</span>
                      )}
                    </div>
                  </Link>
                  <p>
                    <Link href={`/app/${c.username}`} onClick={onClose} className="text-white font-semibold hover:underline">{c.username}</Link>{" "}
                    <span className="text-white/80">{c.content}</span>
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Action bar + comment input */}
          <div className="border-t border-white/10 px-4 pt-3 pb-3 flex-shrink-0 space-y-3">
            <div className="flex items-center gap-4">
              <button onClick={handleLike} className="flex items-center gap-1.5">
                <img
                  src={likeState.liked ? "/icons/heart_red.png" : "/icons/heart_blanked - white.png"}
                  alt="like"
                  className="w-6 h-6 object-contain"
                />
                <span className="text-white text-sm">{likeState.count}</span>
              </button>
              <div className="flex items-center gap-1.5">
                <img src="/icons/comment - white.png" alt="comment" className="w-6 h-6 object-contain" />
                <span className="text-white text-sm">{isLoadingComments ? post.comments_count : comments.length}</span>
              </div>
              <img src="/icons/send_post - white.png" alt="share" className="w-6 h-6 object-contain" />
            </div>
            {userId && (
              <form onSubmit={handleSubmitComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/30"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="px-3 py-2 text-[#e91e8c] text-sm font-semibold disabled:opacity-40"
                >
                  Post
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Next arrow */}
      {currentIndex < posts.length - 1 && (
        <button
          style={{ position: "absolute", right: 20, zIndex: 10 }}
          onClick={(e) => { e.stopPropagation(); goTo(currentIndex + 1); }}
          className="text-white bg-black/60 hover:bg-black/90 rounded-full w-10 h-10 flex items-center justify-center transition"
        >
          <img src="/icons/chevron-sign-right.png" alt="next" className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// ─── Posts grid ───────────────────────────────────────────────────────────────

function PostsGrid({ posts, isOwnProfile, onDeletePost, onPostClick }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  if (posts.length === 0) {
    return <div className="text-white/40 text-center py-20">No posts yet</div>;
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5">
        {posts.map((post, index) => {
          const media = post.media_items?.[0] || {
            media_url: post.media_url,
            media_type: post.media_type,
          };
          return (
            <div
              key={post.id}
              onClick={() => onPostClick(index)}
              className="aspect-square overflow-hidden bg-white/5 relative group cursor-pointer"
            >
              {media.media_type === "image" ? (
                <img
                  src={`${API_URL}${media.media_url}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={`${API_URL}${media.media_url}`}
                  className="w-full h-full object-cover"
                  muted
                />
              )}
              {post.media_items?.length > 1 && (
                <div className="absolute top-2 right-2 opacity-90">
                  <img src="/icons/create_filled - white.png" alt="" className="w-4 h-4" />
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-5">
                <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                  <img src="/icons/heart_red.png" alt="" className="w-5 h-5" />
                  {post.likes_count}
                </div>
                <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                  <img src="/icons/comment - white.png" alt="" className="w-5 h-5" />
                  {post.comments_count}
                </div>
              </div>

              {/* Delete button (own profile only) */}
              {isOwnProfile && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(post.id);
                  }}
                  className="absolute top-2 left-2 w-7 h-7 bg-black/70 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition flex hover:bg-red-600"
                >
                  <img src="/icons/close - white.png" alt="delete" className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="bg-[#111] border border-white/10 rounded-xl w-[320px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-5 border-b border-white/10 text-center">
              <p className="text-white font-semibold mb-1">Delete post?</p>
              <p className="text-white/50 text-sm">This action cannot be undone.</p>
            </div>
            <div className="flex">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 text-white text-sm font-semibold hover:bg-white/5 transition border-r border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeletePost(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="flex-1 py-3 text-red-400 text-sm font-semibold hover:bg-white/5 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AppContent({ userId, profileUserId }) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(null);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showSharePopover, setShowSharePopover] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const isOwnProfile = userId === profileUserId;

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => {
        setLinkCopied(false);
        setShowSharePopover(false);
      }, 1500);
    });
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/users/${profileUserId}/profile?viewer_id=${userId}`
      );
      const data = await res.json();
      if (data.ok) {
        setProfile(data.profile);
        setIsFollowing(data.profile.is_followed_by_viewer);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/users/${profileUserId}/posts?viewer_id=${userId}`
      );
      const data = await res.json();
      if (data.ok) setPosts(data.posts);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    }
  };

  const fetchLikedPosts = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/users/${profileUserId}/liked_posts?viewer_id=${userId}`
      );
      const data = await res.json();
      if (data.ok) setLikedPosts(data.posts);
    } catch (err) {
      console.error("Failed to fetch liked posts:", err);
    }
  };

  const fetchFollowers = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/users/${profileUserId}/followers?viewer_id=${userId}`
      );
      const data = await res.json();
      if (data.ok) setFollowers(data.followers);
    } catch (err) {
      console.error("Failed to fetch followers:", err);
    }
  };

  const fetchFollowing = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/users/${profileUserId}/following?viewer_id=${userId}`
      );
      const data = await res.json();
      if (data.ok) setFollowing(data.following);
    } catch (err) {
      console.error("Failed to fetch following:", err);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchPosts();
  }, [profileUserId]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "liked" && likedPosts.length === 0) fetchLikedPosts();
  };

  const handleOpenFollowers = () => {
    fetchFollowers();
    setShowFollowers(true);
  };

  const handleOpenFollowing = () => {
    fetchFollowing();
    setShowFollowing(true);
  };

  const handleFollowToggle = async (targetUserId) => {
    try {
      const res = await fetch(`${API_URL}/api/users/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ follower_id: userId, following_id: targetUserId }),
      });
      const data = await res.json();
      if (!data.ok) return;

      const updateList = (list) =>
        list.map((u) =>
          u.user_id === targetUserId ? { ...u, is_following: data.following } : u
        );
      setFollowers((prev) => updateList(prev));
      setFollowing((prev) => updateList(prev));

      if (targetUserId === profileUserId) {
        setIsFollowing(data.following);
        setProfile((prev) => ({
          ...prev,
          followers_count: data.following ? prev.followers_count + 1 : prev.followers_count - 1,
        }));
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
    }
  };

  const handleProfileSaved = (updatedUser) => {
    setProfile((prev) => ({ ...prev, ...updatedUser }));
    setShowEditModal(false);
  };

  const handleDeletePost = async (postId) => {
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}?user_id=${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setLikedPosts((prev) => prev.filter((p) => p.id !== postId));
        setProfile((prev) => ({ ...prev, posts_count: prev.posts_count - 1 }));
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  if (isLoading) {
    return <div className="text-white/50 text-center py-24">Loading...</div>;
  }

  if (!profile) {
    return <div className="text-white/50 text-center py-24">User not found</div>;
  }

  const displayPosts =
    activeTab === "posts" ? posts : activeTab === "liked" ? likedPosts : [];

  return (
    <div className="max-w-[900px] mx-auto px-8 py-10">
      {/* Profile Header */}
      <div className="flex items-start gap-16 mb-12">
        {/* Avatar */}
        <div className="w-[150px] h-[150px] rounded-full bg-gradient-to-br from-blue-500 to-purple-500 overflow-hidden flex items-center justify-center flex-shrink-0">
          {profile.profile_image_url ? (
            <img
              src={`${API_URL}${profile.profile_image_url}`}
              alt={profile.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src="/icons/sigma_male_user_image.png"
              alt={profile.username}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4 pt-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-white text-2xl font-light tracking-wide">{profile.username}</h1>
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-5 py-1.5 bg-[#e91e8c] text-white rounded-lg font-semibold text-sm hover:bg-[#c4187a] transition"
                >
                  Edit profile
                </button>
                <button className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
                  <img src="/icons/settings_white.png" alt="settings" className="w-5 h-5 object-contain" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowSharePopover((v) => !v)}
                    className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition"
                  >
                    <img src="/icons/share_icon_white.png" alt="share" className="w-5 h-5 object-contain" />
                  </button>
                  {showSharePopover && (
                    <div
                      className="absolute top-11 right-0 bg-[#1a1a1a] border border-white/10 rounded-xl p-3 shadow-xl z-50 flex flex-col gap-2"
                      style={{ width: 280 }}
                    >
                      <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Share profile</p>
                      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                        <span className="text-white/70 text-xs flex-1 truncate">{typeof window !== "undefined" ? window.location.href : ""}</span>
                      </div>
                      <button
                        onClick={handleCopyLink}
                        className="w-full py-2 rounded-lg text-sm font-semibold transition bg-[#e91e8c] text-white hover:bg-[#c4187a]"
                      >
                        {linkCopied ? "Copied!" : "Copy link"}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleFollowToggle(profileUserId)}
                  className={`px-5 py-1.5 rounded-lg font-semibold text-sm transition ${
                    isFollowing
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "bg-[#e91e8c] text-white hover:bg-[#c4187a]"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
                <button className="px-5 py-1.5 bg-white/10 text-white rounded-lg font-semibold text-sm hover:bg-white/20 transition">
                  Message
                </button>
              </>
            )}
          </div>

          <div className="flex gap-8">
            <span className="text-white text-sm">
              <span className="font-semibold">{profile.posts_count}</span>{" "}
              <span className="text-white/60">posts</span>
            </span>
            <button onClick={handleOpenFollowers} className="text-white text-sm hover:underline text-left">
              <span className="font-semibold">{profile.followers_count}</span>{" "}
              <span className="text-white/60">followers</span>
            </button>
            <button onClick={handleOpenFollowing} className="text-white text-sm hover:underline text-left">
              <span className="font-semibold">{profile.following_count}</span>{" "}
              <span className="text-white/60">following</span>
            </button>
          </div>

          {profile.bio && (
            <p className="text-white/80 text-sm max-w-sm leading-relaxed">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-white/10">
        <div className="flex">
          {[
            { id: "posts", label: "Posts" },
            { id: "saved", label: "Saved" },
            { id: "liked", label: "Liked" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 py-3 text-xs font-semibold tracking-widest uppercase transition border-t-2 -mt-px ${
                activeTab === tab.id
                  ? "border-white text-white"
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mt-1">
        {activeTab === "saved" ? (
          <div className="text-white/40 text-center py-20">Saved posts coming soon</div>
        ) : (
          <PostsGrid
            posts={displayPosts}
            isOwnProfile={isOwnProfile}
            onDeletePost={handleDeletePost}
            onPostClick={(index) => setSelectedPostIndex(index)}
          />
        )}
      </div>

      {/* Post Viewer Modal */}
      {selectedPostIndex !== null && displayPosts.length > 0 && (
        <PostViewerModal
          posts={displayPosts}
          startIndex={selectedPostIndex}
          userId={userId}
          onClose={() => setSelectedPostIndex(null)}
          onLikeUpdate={(postId, liked, count) => {
            const update = (list) =>
              list.map((p) =>
                p.id === postId ? { ...p, is_liked_by_user: liked, likes_count: count } : p
              );
            setPosts((prev) => update(prev));
            setLikedPosts((prev) => update(prev));
          }}
          onCommentUpdate={(postId) => {
            const update = (list) =>
              list.map((p) =>
                p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
              );
            setPosts((prev) => update(prev));
            setLikedPosts((prev) => update(prev));
          }}
        />
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          userId={userId}
          onClose={() => setShowEditModal(false)}
          onSaved={handleProfileSaved}
        />
      )}

      {/* Followers Modal */}
      {showFollowers && (
        <UserListModal
          title="Followers"
          users={followers}
          currentUserId={userId}
          onClose={() => setShowFollowers(false)}
          onFollowToggle={handleFollowToggle}
        />
      )}

      {/* Following Modal */}
      {showFollowing && (
        <UserListModal
          title="Following"
          users={following}
          currentUserId={userId}
          onClose={() => setShowFollowing(false)}
          onFollowToggle={handleFollowToggle}
        />
      )}
    </div>
  );
}
