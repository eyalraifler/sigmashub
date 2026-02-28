"use client";

import { useState, useRef } from "react";

export default function CreatePost({ userId, onPostCreated }) {
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]); // [{file, preview, type}]
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

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

    // Reset input so selecting the same files again works
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = (index) =>
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));

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

      // Convert all files to base64 in parallel
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

      const response = await fetch("http://localhost:8000/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      // Reset form
      setCaption("");
      setTags([]);
      setTagInput("");
      setMediaFiles([]);

      if (onPostCreated) onPostCreated(data);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to create post");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="border border-white/10 bg-white/5 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-white mb-4">Create Post</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Media thumbnails strip */}
        {mediaFiles.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {mediaFiles.map((item, i) => (
              <div key={i} className="relative flex-shrink-0 w-24 h-24">
                {item.type === "image" ? (
                  <img
                    src={item.preview}
                    alt={`media-${i}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <video
                    src={item.preview}
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
          </div>
        )}

        {/* File input (always visible so user can add more) */}
        {mediaFiles.length < 10 && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="block w-full text-sm text-white/70
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-500 file:text-white
                hover:file:bg-blue-600 file:cursor-pointer"
            />
            <div className="text-white/40 text-xs mt-1 text-right">
              {mediaFiles.length}/10 files
            </div>
          </div>
        )}

        {/* Caption */}
        <div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
            rows={3}
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="#tag"
              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
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
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/40 rounded-full text-blue-400 text-sm"
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
          )}
          <div className="text-white/40 text-xs text-right">{tags.length}/20 tags</div>
        </div>

        {/* Error */}
        {error && <div className="text-red-500 text-sm">{error}</div>}

        {/* Submit */}
        <button
          type="submit"
          disabled={isUploading || mediaFiles.length === 0}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isUploading ? "Uploading..." : "Post"}
        </button>
      </form>
    </div>
  );
}
