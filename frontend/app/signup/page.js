"use client";

import { useState } from "react";
import SignupForm from "./SignUpForm";
import ImageCarouselWrapper from "../components/ImageCarouselWrapper";
import { handleSignup, handleOnboarding } from "./actions";

export default function SignupPage() {
  const [showImages, setShowImages] = useState(true);

  return (
    <div className="min-h-screen flex bg-[#141D29] overflow-x-hidden">
      {/* 1. Only renders if we are on Step 1 */}
      {showImages && <ImageCarouselWrapper />}
      
      {/* 2. flex-1 makes this fill all remaining space */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 transition-all duration-700 ease-in-out">
        <div className="w-full max-w-md">
          <SignupForm 
            signupAction={handleSignup}
            onboardingAction={handleOnboarding}
            onStepSuccess={() => setShowImages(false)}
          />
        </div>
      </div>
    </div>
  );
}