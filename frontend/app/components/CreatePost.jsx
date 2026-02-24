"use client";

import { useState, useRef } from "react";

export default function CreatePost({ userId, onPostCreated }) {
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setError("Please select an image or video file");
      return;
    }

    setError("");
    setMediaFile(file);
    setMediaType(isImage ? "image" : "video");

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!mediaFile) {
      setError("Please select an image or video");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      // Validate userId
      if (!userId || isNaN(userId)) {
        throw new Error("Invalid user ID. Please log in again.");
      }

      // Convert file to base64 using Promise
      const base64String = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(mediaFile);
      });

      // Upload to server
      console.log("Uploading post for user:", userId);
      const response = await fetch("http://localhost:8000/api/posts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          caption: caption,
          media_base64: base64String,
          media_type: mediaType,
        }),
      }).catch((fetchError) => {
        console.error("Fetch error:", fetchError);
        throw new Error(
          `Cannot connect to server: ${fetchError.message}. Make sure the backend is running on port 8000.`
        );
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Failed to create post");
      }

      // Reset form
      setCaption("");
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Notify parent component
      if (onPostCreated) {
        onPostCreated(data);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to create post");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="border border-white/10 bg-white/5 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-white mb-4">Create Post</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Media Preview */}
        {mediaPreview && (
          <div className="relative">
            {mediaType === "image" ? (
              <img
                src={mediaPreview}
                alt="Preview"
                className="w-full h-auto max-h-96 object-contain rounded-lg"
              />
            ) : (
              <video
                src={mediaPreview}
                controls
                className="w-full h-auto max-h-96 rounded-lg"
              />
            )}
            <button
              type="button"
              onClick={handleRemoveMedia}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
            >
              ×
            </button>
          </div>
        )}

        {/* File Input */}
        {!mediaPreview && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="block w-full text-sm text-white/70
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-500 file:text-white
                hover:file:bg-blue-600 file:cursor-pointer"
            />
          </div>
        )}

        {/* Caption Input */}
        <div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
            rows={3}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isUploading || !mediaFile}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isUploading ? "Uploading..." : "Post"}
        </button>
      </form>
    </div>
  );
}
