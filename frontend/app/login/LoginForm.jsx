"use client";

import { useState, useRef, useEffect } from "react";
import { useActionState } from "react";

export default function LoginForm({ loginAction, verifyAction, resendAction }) {
  const [show, setShow] = useState(false);
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, null);
  const [verifyState, verifyFormAction, verifyPending] = useActionState(verifyAction, null);
  const [email, setEmail] = useState("");

  // Track if we're in verification mode
  const needsVerification = loginState?.ok && loginState?.requires_verification;

  return (
    <div className="fixed inset-0 flex">
      {/* Left side - Image */}
      <div className="hidden lg:block h-full flex-shrink-0">
        <img 
          src="/login_image.png" 
          alt="Login illustration" 
          className="h-full w-auto object-contain"
        />
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 h-full flex items-center justify-center p-4 lg:p-8 bg-gradient-to-br from-[#0f0f1e] via-[#1a1a2e] to-[#16213e] overflow-y-auto">
        <div className="w-full max-w-md relative">
          <a 
            href="/" 
            className="fixed top-7 right-5 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm hover:bg-white/20 transition-all z-10"
          >
            ← Back to website
          </a>

          {!needsVerification ? (
            // Step 1: Email & Password
            <>
              <h1 className="text-4xl font-bold mb-2 text-white">Welcome Back!</h1>
              <p className="mb-8 text-gray-400">
                Don't have an account yet?{" "}
                <a href="/signup" className="text-purple-400 hover:text-purple-300">
                  signup
                </a>
              </p>

              <form action={loginFormAction} className="space-y-4">
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={show ? "text" : "password"}
                    placeholder="Password"
                    required
                    className="w-full px-4 py-3 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
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

                <button
                  type="submit"
                  disabled={loginPending}
                  className="w-full py-3 bg-purple-700 text-white font-semibold rounded-lg hover:bg-purple-600 disabled:opacity-50 shadow-lg shadow-purple-500/30 transition-colors"
                >
                  {loginPending ? "Checking..." : "Continue"}
                </button>

                {loginState?.error && (
                  <p className="text-red-400 text-sm mt-2">{loginState.error}</p>
                )}
              </form>
            </>
          ) : (
            // Step 2: Verification Code
            <VerificationStep 
              email={email} 
              verifyFormAction={verifyFormAction}
              verifyPending={verifyPending}
              verifyState={verifyState}
              resendAction={resendAction}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function VerificationStep({ email, verifyFormAction, verifyPending, verifyState, resendAction }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [resendState, resendFormAction, resendPending] = useActionState(resendAction, null);
  const inputRefs = useRef([]);
  const resendFormRef = useRef(null);

  useEffect(() => {
    // Auto-focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  // Clear input boxes when resend is successful
  useEffect(() => {
    if (resendState?.ok) {
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  }, [resendState]);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = [...code];
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);

    // Focus the next empty input or last input
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleResendClick = () => {
    // Trigger the hidden form submission
    if (resendFormRef.current) {
      resendFormRef.current.requestSubmit();
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="text-4xl font-bold mb-2 text-white">Verify Your Email</h1>
      <p className="mb-8 text-gray-400">
        We sent a 6-digit code to <span className="text-white">{email}</span>
      </p>

      <form action={verifyFormAction} className="space-y-6">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="code" value={code.join("")} />

        <div className="flex gap-2 justify-center">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-12 h-14 text-center text-2xl font-bold bg-[#1a1a2e] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={verifyPending || code.join("").length !== 6}
          className="w-full py-3 bg-purple-700 text-white font-semibold rounded-lg hover:bg-purple-600 disabled:opacity-50 shadow-lg shadow-purple-500/30 transition-colors"
        >
          {verifyPending ? "Verifying..." : "Verify & Log In"}
        </button>

        {verifyState?.error && (
          <p className="text-red-400 text-sm mt-2">{verifyState.error}</p>
        )}

        {resendState?.ok && (
          <p className="text-green-400 text-sm mt-2">✓ New code sent! Check your email.</p>
        )}
        
        {resendState?.error && (
          <p className="text-red-400 text-sm mt-2">{resendState.error}</p>
        )}

        <p className="text-center text-gray-400 text-sm">
          Didn't receive the code?{" "}
          <button
            type="button"
            onClick={handleResendClick}
            disabled={resendPending}
            className="text-purple-400 hover:text-purple-300 disabled:opacity-50"
          >
            {resendPending ? "Sending..." : "Try again"}
          </button>
        </p>
      </form>

      {/* Hidden form for resend - submitted programmatically */}
      <form ref={resendFormRef} action={resendFormAction} className="hidden">
        <input type="hidden" name="email" value={email} />
      </form>
    </div>
  );
}