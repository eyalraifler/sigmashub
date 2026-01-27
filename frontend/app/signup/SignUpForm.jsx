"use client";

import { useState, useRef, useEffect } from "react";
import { useActionState } from "react";

const DEFAULT_AVATARS = [
  "/icons/default_avatar_1.png", "/icons/default_avatar_2.png", "/icons/default_avatar_3.png",
  "/icons/default_avatar_4.png", "/icons/default_avatar_5.png", "/icons/default_avatar_6.png",
];

export default function SignupForm({ signupAction, onboardingAction, onStepSuccess }) {
  const [show, setShow] = useState(false);
  const [state, formAction, pending] = useActionState(signupAction, null);
  
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Notify parent to hide images when step 1 is successful
  useEffect(() => {
    if (state?.ok && state?.credentials) {
      if (onStepSuccess) onStepSuccess();
    }
  }, [state, onStepSuccess]);

  useEffect(() => {
    const saved = localStorage.getItem("signup_form_data");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setEmail(data.email || "");
        setUsername(data.username || "");
        setPassword(data.password || "");
      } catch (e) { console.error(e); }
    }
  }, []);

  const handleInputChange = (field, value) => {
    const newData = { email, username, password, [field]: value };
    if (field === "email") setEmail(value);
    if (field === "username") setUsername(value);
    if (field === "password") setPassword(value);
    localStorage.setItem("signup_form_data", JSON.stringify(newData));
  };

  if (state?.ok && state?.credentials) {
    return (
      <div className="w-full animate-in fade-in duration-700">
        <OnboardingInline credentials={state.credentials} action={onboardingAction} />
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <a href="/" className="fixed top-7 right-5 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm hover:bg-white/20 transition-all z-10">
        ← Back to website
      </a>
      <h1 className="text-4xl font-bold mb-2 text-white">Create an account</h1>
      <p className="mb-8 text-gray-400">Already have an account? <a href="/login" className="text-purple-400 hover:text-purple-300">log in</a></p>

      <form action={formAction} className="space-y-4">
        <input name="username" type="text" placeholder="Username" value={username} onChange={(e) => handleInputChange("username", e.target.value)} required className="w-full px-4 py-3 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500" />
        <input name="email" type="email" placeholder="Email" value={email} onChange={(e) => handleInputChange("email", e.target.value)} required className="w-full px-4 py-3 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500" />
        <div className="relative">
          <input name="password" type={show ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => handleInputChange("password", e.target.value)} required className="w-full px-4 py-3 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500" />
          <button 
            type="button" 
            onClick={() => setShow(!show)} 
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
          >
            <img 
              src={show ? "/icons/open_eye.png" : "/icons/closed_eye.png"} 
              alt={show ? "Hide" : "Show"} 
              className="w-6 h-6 object-contain"
            />
          </button>
        </div>
        <button type="submit" disabled={pending} className="w-full py-3 bg-purple-700 text-white font-semibold rounded-lg hover:bg-purple-600 disabled:opacity-50 shadow-lg shadow-purple-500/30">
          {pending ? "Creating..." : "Create account"}
        </button>
        {state?.error && <p className="text-red-400 text-sm mt-2">{state.error}</p>}
      </form>
    </div>
  );
}

function OnboardingInline({ credentials, action }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATARS[0]);
  const [uploadedImage, setUploadedImage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (state?.ok) localStorage.removeItem("signup_form_data");
  }, [state]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate that it's an image
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Read the file and convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setUploadedImage(base64String);
      setSelectedAvatar(base64String);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full">
      <a href="/" className="fixed top-7 right-5 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm hover:bg-white/20 transition-all z-10">
        ← Back to website
      </a>
      
      <h2 className="text-3xl font-bold mb-2 text-white text-left">Complete your profile</h2>
      <p className="mb-6 text-gray-400 text-left">Choose a profile picture and add a bio.</p>

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="email" value={credentials.email} />
        <input type="hidden" name="username" value={credentials.username} />
        <input type="hidden" name="password" value={credentials.password} />
        <input type="hidden" name="avatar_data" value={selectedAvatar || ''} />
        
        <div className="flex flex-col items-center space-y-4">
          {/* Large preview of selected avatar */}
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-500 shadow-lg">
            <img src={selectedAvatar} alt="Selected avatar" className="w-full h-full object-cover" />
          </div>

          {/* Upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-500 transition-colors"
          >
            Upload Your Own Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Default avatar options */}
          <div className="grid grid-cols-6 gap-3 w-full">
            {DEFAULT_AVATARS.map((path, i) => (
              <button 
                key={i} 
                type="button" 
                onClick={() => {
                  setSelectedAvatar(path);
                  setUploadedImage(null);
                }}
                className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${
                  selectedAvatar === path && !uploadedImage 
                    ? 'border-purple-500 scale-110' 
                    : 'border-gray-600 hover:border-gray-400'
                }`}
              >
                <img src={path} alt={`Default avatar ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        
        <textarea 
          name="bio" 
          placeholder="Bio (optional)" 
          className="w-full p-3 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500" 
          rows={4} 
        />
        
        <button 
          type="submit" 
          disabled={pending} 
          className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 disabled:opacity-50 transition-colors"
        >
          {pending ? "Finishing..." : "Complete Signup"}
        </button>
        
        {state?.error && <p className="text-red-400 text-sm mt-2">{state.error}</p>}
      </form>
    </div>
  );
}