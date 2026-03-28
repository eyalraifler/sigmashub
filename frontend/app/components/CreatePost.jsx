"use client";

import { useState, useRef, useEffect } from "react";
import { API_URL } from "../lib/config";
import { getAccessToken } from "../lib/auth";
import PostSuccessAnimation from "./PostSuccessAnimation";

function PostPreview({ caption, tags, mediaFiles, username, profileImageUrl }) {
  const [mediaIndex, setMediaIndex] = useState(0);

  // Reset index when media changes
  useEffect(() => {
    setMediaIndex((i) => Math.min(i, Math.max(0, mediaFiles.length - 1)));
  }, [mediaFiles.length]);

  const currentMedia = mediaFiles[mediaIndex];

  return (
    <div className="border border-white/10 bg-white/5 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {profileImageUrl ? (
              <img
                src={`${API_URL}${profileImageUrl}`}
                alt={username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-semibold text-sm">
                {username ? username[0].toUpperCase() : "?"}
              </span>
            )}
          </div>
          <span className="text-white font-semibold text-sm">{username || "Name"}</span>
        </div>
        <img src="/icons/three_dots_white.png" alt="more" className="w-5 h-5 object-contain" />
      </div>

      {/* Media with carousel */}
      <div className="bg-black/40 aspect-square flex items-center justify-center relative overflow-hidden">
        {currentMedia ? (
          currentMedia.type === "image" ? (
            <img src={currentMedia.preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <video src={currentMedia.preview} controls className="w-full h-full object-cover" />
          )
        ) : (
          <span className="text-white/20 text-sm">No image selected</span>
        )}

        {/* Carousel controls */}
        {mediaFiles.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setMediaIndex((i) => Math.max(0, i - 1))}
              disabled={mediaIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80 disabled:opacity-30"
            >
              <img src="/icons/chevron-sign-left.png" alt="previous" className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMediaIndex((i) => Math.min(mediaFiles.length - 1, i + 1))}
              disabled={mediaIndex === mediaFiles.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80 disabled:opacity-30"
            >
              <img src="/icons/chevron-sign-right.png" alt="next" className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {mediaFiles.map((_, i) => (
                <button
                  key={i}
                  type="button"
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
          {/* Heart */}
          <div className="flex items-center gap-1">
            <img 
              src="/icons/heart_red.png"
              alt="like"
              className="w-5 h-5 object-contain" 
            />
            <span className="text-sm">1,500</span>
          </div>
          {/* Comment */}
          <div className="flex items-center gap-1">
            <img 
              src="/icons/comment - white.png" 
              alt="Comments"
              className="w-5 h-5 object-contain" 
            />
            <span className="text-sm">10</span>
          </div>
          {/* Share */}
          <div className="flex items-center">
            <img
              src="/icons/send_post - white.png"
              alt="share"
              className="w-5 h-5 object-contain"
            />
          </div>
          {/* Save */}
          <div className="flex items-center ml-auto">
            <img
              src="/icons/download - white.png"
              alt="download"
              className="w-5 h-5 object-contain"
            />
          </div>
        </div>

        {/* Caption */}
        {caption ? (
          <p className="text-white text-sm italic">
            <span className="font-semibold not-italic">{username || "Name"}</span>{" "}
            {caption}
          </p>
        ) : (
          <p className="text-white/30 text-sm italic">Caption will appear here...</p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className="text-blue-400 text-sm">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreatePost({ userId, onPostCreated, username }) {
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]); // [{file, preview, type}]
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [error, setError] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_URL}/api/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setProfileImageUrl(data.user.profile_image_url);
      })
      .catch(() => {});
  }, [userId]);

  // --- Tag handlers ---
  const addTag = () => {
    const normalized = tagInput.replace(/^#+/, "").trim().toLowerCase();
    if (!normalized) return;
    if (tags.length >= 20) return;
    if (tags.includes(normalized)) { setTagInput(""); return; }
    setTags([...tags, normalized]);
    setTagInput("");
  };
  const removeTag = (index) => setTags(tags.filter((_, i) => i !== index));
  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
  };

  // --- Media handlers ---
  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    setError("");

    const remaining = 10 - mediaFiles.length;
    const toAdd = selected.slice(0, remaining);

    toAdd.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaFiles((prev) =>
          prev.length < 10
            ? [...prev, { file, preview: reader.result, type: isImage ? "image" : "video" }]
            : prev
        );
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = (index) =>
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));

  // --- AI Tag generation ---
  const handleGenerateTags = async () => {
    if (!caption.trim()) return;
    setIsGeneratingTags(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/ask_ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: caption, existing_tags: tags }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.detail || "AI failed to generate tags");
      const rawTags = data.response
        .split(",")
        .map((t) => t.replace(/^#+/, "").trim().toLowerCase())
        .filter((t) => t.length > 0);
      const merged = [...new Set([...tags, ...rawTags])].slice(0, 20);
      setTags(merged);
    } catch (err) {
      setError(err.message || "Failed to generate tags");
    } finally {
      setIsGeneratingTags(false);
    }
  };

  // --- Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mediaFiles.length === 0) {
      setError("Please select at least one image or video");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      if (!userId || isNaN(userId)) {
        throw new Error("Invalid user ID. Please log in again.");
      }

      const media_items = await Promise.all(
        mediaFiles.map(({ file, type }) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () =>
              resolve({ media_base64: reader.result, media_type: type });
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file);
          })
        )
      );

      const token = getAccessToken();
      const response = await fetch(`${API_URL}/api/posts/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          user_id: userId,
          caption,
          tags,
          media_items,
        }),
      }).catch((fetchError) => {
        throw new Error(
          `Cannot connect to server: ${fetchError.message}. Make sure the backend is running on port 8000.`
        );
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Failed to create post");

      setCaption("");
      setTags([]);
      setTagInput("");
      setMediaFiles([]);
      setShowSuccessAnimation(true);

      if (onPostCreated) onPostCreated(data);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to create post");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
    {showSuccessAnimation && (
      <PostSuccessAnimation onDone={() => setShowSuccessAnimation(false)} />
    )}
    <form onSubmit={handleSubmit}>
      <div className="flex gap-6 items-start">

        {/* LEFT COLUMN - New Post form */}
        <div className="flex-1 space-y-4">
          <h2 className="text-2xl font-bold italic text-white">New Post</h2>

          {/* Images card */}
          <div className="border border-white/10 bg-white/5 rounded-xl p-4 space-y-3">
            <label className="block text-white/70 text-sm font-semibold uppercase tracking-wide italic">
              ADD IMAGES
            </label>
            <div className="grid grid-cols-3 gap-2">
              {mediaFiles.map((item, i) => (
                <div key={i} className="relative aspect-square">
                  {item.type === "image" ? (
                    <img
                      src={item.preview}
                      alt={`media-${i}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <video
                      src={item.preview}
                      controls
                      className="w-full h-full object-cover rounded-lg"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
              {mediaFiles.length < 10 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center text-white/40 hover:border-white/40 hover:text-white/60 transition-colors text-3xl font-light"
                >
                  +
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="text-white/40 text-xs text-right">{mediaFiles.length}/10 files</div>
          </div>

          {/* Caption card */}
          <div className="border border-white/10 bg-white/5 rounded-xl p-4 space-y-2">
            <label className="block text-white/70 text-sm font-semibold italic">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") e.stopPropagation(); }}
              placeholder="Write a caption..."
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500 resize-none"
              rows={4}
            />
            <div className="text-white/40 text-xs text-right">{caption.length}</div>
          </div>

          {/* Tags card */}
          <div className="border border-white/10 bg-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-white/70 text-sm font-semibold italic">Tags</label>
              <div className="relative group">
                <button
                  type="button"
                  onClick={handleGenerateTags}
                  disabled={!caption.trim() || isGeneratingTags}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 border border-purple-500/40 rounded-lg text-purple-300 text-xs font-semibold hover:bg-purple-600/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <img src="/icons/ai_icon.png" alt="AI" className="w-7 h-7 object-contain" />
                  {isGeneratingTags ? "Generating..." : "AI Autofill"}
                </button>
                {!caption.trim() && (
                  <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-black/90 text-white/80 text-xs rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    Must write a bio to use AI autofill
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add your Sigma Tags (up to 20)"
                className="flex-1 px-3 py-2 bg-white/10 border border-amber-500/50 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={addTag}
                disabled={tags.length >= 20 || !tagInput.trim()}
                className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div>
                <span className="text-white/50 text-xs mr-1">Picked:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tags.map((tag, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/50 rounded-full text-amber-400 text-sm"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(i)}
                        className="hover:text-white leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="text-white/40 text-xs text-right">{tags.length}/20 tags</div>
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUploading || mediaFiles.length === 0}
              className="px-8 py-2 bg-blue-500 text-white rounded-lg font-semibold italic hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {isUploading ? "Uploading..." : "Publish"}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN - Preview */}
        <div className="flex-1 space-y-4">
          <h2 className="text-2xl font-bold italic text-white text-center">Preview</h2>
          <p className="text-white/50 text-sm text-center italic">
            Preview shows how your content will look when published
          </p>
          <PostPreview
            caption={caption}
            tags={tags}
            mediaFiles={mediaFiles}
            username={username}
            profileImageUrl={profileImageUrl}
          />
        </div>

      </div>
    </form>
    </>
  );
}
