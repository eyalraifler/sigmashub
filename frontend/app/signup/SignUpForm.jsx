"use client";

import { useState, useRef } from "react";
import { useActionState } from "react";

// Default avatar options (make sure these exist in /public/icons/)
const DEFAULT_AVATARS = [
  "/icons/default_avatar_1.png",
  "/icons/default_avatar_2.png",
  "/icons/default_avatar_3.png",
  "/icons/default_avatar_4.png",
  "/icons/default_avatar_5.png",
  "/icons/default_avatar_6.png",
];

export default function SignupForm({ signupAction, onboardingAction }) {
  const [show, setShow] = useState(false);
  const [state, formAction, pending] = useActionState(signupAction, null);

  // If signup succeeded - show onboarding UI instead of signup form
  if (state?.ok && state?.credentials) {
    return (
      <div className="border p-4 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">Complete your profile</h2>
        <p className="mb-4 text-gray-600">
          Choose a profile picture and add a bio.
        </p>

        <OnboardingInline 
          credentials={state.credentials}
          action={onboardingAction}
        />
      </div>
    );
  }

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="email" className="mr-4">Email</label>
        <input 
          id="email" 
          name="email" 
          type="email" 
          required 
          className="border px-2 py-1 rounded" 
        />
      </div>

      <div className="mt-3">
        <label htmlFor="username" className="mr-4">Username</label>
        <input 
          id="username" 
          name="username" 
          type="text" 
          required 
          className="border px-2 py-1 rounded" 
        />
      </div>

      <div className="mt-3">
        <label htmlFor="password" className="mr-4">Password</label>
        <input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          required
          className="border px-2 py-1 rounded"
        />
        <button 
          type="button" 
          onClick={() => setShow(v => !v)} 
          className="ml-2 text-blue-600 hover:underline"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>

      <button 
        type="submit" 
        disabled={pending} 
        className="border border-blue-500 bg-blue-500 text-white font-bold mt-4 px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Checking..." : "Continue"}
      </button>

      {state?.error && (
        <p className="mt-2 text-red-500">{state.error}</p>
      )}
    </form>
  );
}


function OnboardingInline({ credentials, action }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [selectedAvatar, setSelectedAvatar] = useState(null); // path or base64
  const [avatarType, setAvatarType] = useState(null); // 'default' or 'custom'
  const fileInputRef = useRef(null);

  const handleDefaultAvatarClick = (avatarPath) => {
    setSelectedAvatar(avatarPath);
    setAvatarType('default');
    // Clear file input if exists
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (PNG, JPEG, GIF, or WebP)');
      e.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      e.target.value = '';
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedAvatar(reader.result);
      setAvatarType('custom');
    };
    reader.readAsDataURL(file);
  };

  return (
    <form action={formAction} className="space-y-4">
      {/* Hidden fields to pass credentials */}
      <input type="hidden" name="email" value={credentials.email} />
      <input type="hidden" name="username" value={credentials.username} />
      <input type="hidden" name="password" value={credentials.password} />
      <input type="hidden" name="avatar_data" value={selectedAvatar || ''} />

      <div>
        <label className="block mb-3 font-medium text-lg">Choose a profile picture</label>
        
        {/* Default avatars grid */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Select a default avatar:</p>
          <div className="grid grid-cols-6 gap-3">
            {DEFAULT_AVATARS.map((avatarPath, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleDefaultAvatarClick(avatarPath)}
                className={`
                  w-16 h-16 rounded-full overflow-hidden border-4 transition-all
                  ${selectedAvatar === avatarPath && avatarType === 'default'
                    ? 'border-blue-500 ring-2 ring-blue-300' 
                    : 'border-gray-300 hover:border-blue-400'
                  }
                `}
              >
                <img 
                  src={avatarPath} 
                  alt={`Default avatar ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Custom upload option */}
        <div className="border-t pt-4">
          <p className="text-sm text-gray-600 mb-2">Or upload your own:</p>
          <input 
            ref={fileInputRef}
            type="file" 
            name="avatar_file" 
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            onChange={handleFileChange}
            className="block text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">PNG, JPEG, GIF, or WebP (max 5MB)</p>
        </div>

        {/* Preview selected avatar */}
        {selectedAvatar && (
          <div className="mt-4 flex items-center gap-3">
            <p className="text-sm font-medium">Selected:</p>
            <img 
              src={selectedAvatar} 
              alt="Selected avatar" 
              className="w-20 h-20 rounded-full object-cover border-4 border-green-500"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block mb-2 font-medium text-lg">Bio (optional)</label>
        <textarea 
          name="bio" 
          maxLength={200} 
          className="border w-full p-3 rounded-lg resize-none focus:ring-2 focus:ring-blue-400 focus:outline-none" 
          rows={4}
          placeholder="Tell us about yourself..."
        />
        <p className="text-xs text-gray-500 mt-1">Maximum 200 characters</p>
      </div>

      <button 
        type="submit" 
        disabled={pending}
        className="w-full border border-green-600 bg-green-600 text-white font-bold px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Creating your account..." : "Complete signup"}
      </button>

      {state?.error && (
        <p className="mt-2 text-red-500 font-medium">{state.error}</p>
      )}
    </form>
  );
}