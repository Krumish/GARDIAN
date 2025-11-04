import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import {
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1 = email/password, 2 = OTP
  const [phoneNumber, setPhoneNumber] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [userCredentials, setUserCredentials] = useState(null);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const navigate = useNavigate();

  // ✅ Initialize reCAPTCHA safely once
  useEffect(() => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch {}
      delete window.recaptchaVerifier;
    }

    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: (response) => {
          console.log("reCAPTCHA verified:", response);
        },
        "expired-callback": () => {
          console.warn("reCAPTCHA expired. Resetting...");
          try {
            window.recaptchaVerifier.reset();
          } catch {}
        },
      });
      console.log("✅ reCAPTCHA initialized");
    } catch (err) {
      console.error("reCAPTCHA init error:", err);
    }

    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {}
        delete window.recaptchaVerifier;
      }
    };
  }, []);

  // ✅ Timer for resend button
  useEffect(() => {
    let t;
    if (resendCooldown > 0) {
      t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ✅ Step 1: Email + Password login with status check
  const handleCredentials = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get Firestore record for admin
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists() || docSnap.data().role !== "admin") {
        setMessage("❌ Access denied. Admin only.");
        await auth.signOut();
        setLoading(false);
        return;
      }

      const userData = docSnap.data();
      const status = userData.status || "active"; // Default to active if no status field

      // ✅ Check account status
      if (status === "suspended") {
        setMessage("❌ Your account has been suspended. Please contact support.");
        await auth.signOut();
        setLoading(false);
        return;
      }

      if (status === "pending") {
        setShowPendingModal(true);
        await auth.signOut();
        setLoading(false);
        return;
      }

      // Only "active" accounts can proceed
      if (status !== "active") {
        setMessage("❌ Your account status is invalid. Please contact support.");
        await auth.signOut();
        setLoading(false);
        return;
      }

      const phone = userData.phone;
      if (!phone) {
        setMessage("❌ No phone number registered for this admin.");
        await auth.signOut();
        setLoading(false);
        return;
      }

      // Store credentials for re-authentication after OTP
      setUserCredentials({ email, password });
      setPhoneNumber(phone);

      // Sign out temporarily to prepare for phone auth
      await auth.signOut();

      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, phone, appVerifier);

      setConfirmationResult(confirmation);
      setStep(2);
      setResendCooldown(30);
      setMessage("✅ Verification code sent via SMS.");
    } catch (err) {
      console.error(err);
      setMessage("❌ " + (err.message || "Login failed."));
      try {
        await auth.signOut();
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  // ✅ Step 2: Verify OTP and re-authenticate with email/password
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!confirmationResult) {
      setMessage("❌ No verification in progress. Please log in again.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      // Confirm the OTP (this verifies 2FA)
      await confirmationResult.confirm(otp);
      console.log("✅ Phone verification successful");
      
      // sign out from phone auth and re-sign in
      await auth.signOut();
      
      // Re-authenticate with the ORIGINAL credentials
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        userCredentials.email, 
        userCredentials.password
      );
      
      console.log("✅ Re-authenticated with original account:", userCredential.user.uid);
      
      setMessage("Verified successfully. Redirecting...");
      
      // Navigate to dashboard
      setTimeout(() => {
        console.log("Navigating to dashboard...");
        navigate("/", { replace: true });
      }, 500);
    } catch (err) {
      console.error("OTP Error:", err);
      if (err.code === "auth/invalid-verification-code") {
        setMessage("❌ Invalid verification code.");
      } else if (err.code === "auth/code-expired") {
        setMessage("❌ Code expired. Please request a new one.");
      } else {
        setMessage("❌ Verification failed. Please try again.");
      }
      setLoading(false);
    }
  };

  // ✅ Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setMessage("");
    try {
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setResendCooldown(30);
      setMessage("✅ Code resent. Check your phone.");
    } catch (err) {
      console.error("Resend error:", err);
      setMessage("❌ " + (err.message || "Failed to resend code."));
    } finally {
      setLoading(false);
    }
  };

  // ✅ Cancel / Back button
  const handleCancel = async () => {
    setStep(1);
    setOtp("");
    setConfirmationResult(null);
    setMessage("");
    setUserCredentials(null);
    try {
      await auth.signOut();
    } catch {}
  };

  // ✅ Close pending modal
  const closePendingModal = () => {
    setShowPendingModal(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#213547] text-gray-900">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md border-t-4 border-[#7AE2CF]">
        <h1 className="text-2xl font-bold mb-6 text-center text-[#213547]">
          Admin Login
        </h1>

        {step === 1 && (
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                className="w-full border rounded-md px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                className="w-full border rounded-md px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-md font-semibold text-white transition"
              style={{
                backgroundColor: "#213547",
              }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-center text-[#213547]">
              A 6-digit code was sent to <strong>{phoneNumber}</strong>
            </p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter code"
              className="w-full border rounded-md px-3 py-2 text-center tracking-widest"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
            />

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 rounded-md font-semibold text-white transition"
                style={{
                  backgroundColor: "#213547",
                }}
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify"}
              </button>

              <button
                type="button"
                onClick={handleResend}
                className="px-3 py-2 rounded-md border text-sm"
                disabled={loading || resendCooldown > 0}
                style={{
                  borderColor: "#213547",
                  color: "#213547",
                  background: "#f9fafb",
                }}
              >
                {resendCooldown > 0
                  ? `Resend (${resendCooldown}s)`
                  : "Resend"}
              </button>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              className="w-full mt-2 text-xs text-gray-500 hover:underline"
            >
              ← Back to Login
            </button>
          </form>
        )}

        {message && (
          <p
            className="mt-4 text-sm text-center"
            style={{
              color: message.startsWith("✅") ? "green" : "#b91c1c",
            }}
          >
            {message}
          </p>
        )}

        <div id="recaptcha-container"></div>
      </div>

      {/* ✅ Pending Account Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#213547] mb-3">
                Account Pending
              </h2>
              <p className="text-gray-600 mb-6">
                Your admin account is currently waiting for approval. Please check back later or contact support for more information.
              </p>
              <button
                onClick={closePendingModal}
                className="w-full py-2 px-4 rounded-md font-semibold text-white transition"
                style={{
                  backgroundColor: "#213547",
                }}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}