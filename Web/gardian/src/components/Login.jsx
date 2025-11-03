import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import {
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
  const [userEmail, setUserEmail] = useState(""); // Store email for later
  const [originalUid, setOriginalUid] = useState(""); // Store original UID
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

  // ✅ Step 1: Email + Password login
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

      const phone = docSnap.data().phone;
      if (!phone) {
        setMessage("❌ No phone number registered for this admin.");
        await auth.signOut();
        setLoading(false);
        return;
      }

      // Store user info for later
      setUserEmail(email);
      setOriginalUid(user.uid);
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

  // ✅ Step 2: Verify OTP
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!confirmationResult) {
      setMessage("❌ No verification in progress. Please log in again.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      // Confirm the OTP - this will sign the user in with phone auth
      const result = await confirmationResult.confirm(otp);
      console.log("✅ Phone verification successful:", result.user.uid);
      
      // CRITICAL FIX: Copy admin role to phone auth UID
      const phoneAuthUid = result.user.uid;
      
      // Create/update Firestore document for phone auth UID with admin role
      await setDoc(doc(db, "users", phoneAuthUid), {
        role: "admin",
        email: userEmail,
        phone: phoneNumber,
        originalUid: originalUid,
        createdAt: new Date().toISOString()
      }, { merge: true });
      
      console.log("✅ Admin role set for phone auth user");
      
      // Wait for Firestore to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify the user is actually signed in
      const currentUser = auth.currentUser;
      console.log("Current user after OTP:", currentUser?.uid);
      
      if (!currentUser) {
        setMessage("❌ Authentication failed. Please try again.");
        setLoading(false);
        return;
      }
      
      setMessage("✅ Verified successfully. Redirecting...");
      
      // Navigate to dashboard after successful verification
      setTimeout(() => {
        console.log("🚀 Navigating to dashboard...");
        navigate("/", { replace: true });
      }, 500);
    } catch (err) {
      console.error("OTP Error:", err);
      setMessage("❌ Invalid verification code.");
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
    setUserEmail("");
    setOriginalUid("");
    try {
      await auth.signOut();
    } catch {}
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
    </div>
  );
}