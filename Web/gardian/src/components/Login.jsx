import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import {
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

// ── Inline styles & keyframes injected once 
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

  .grd-root * { box-sizing: border-box; }

  .grd-root {
    font-family: 'DM Sans', sans-serif;
  }

  .grd-panel-left {
    background: linear-gradient(to bottom, #111827, #1f2937, #111827);
    position: relative;
    overflow: hidden;
  }

  /* animated grid lines */
  .grd-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(96,165,250,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(96,165,250,0.06) 1px, transparent 1px);
    background-size: 40px 40px;
    animation: gridDrift 20s linear infinite;
  }

  @keyframes gridDrift {
    0%   { background-position: 0 0; }
    100% { background-position: 40px 40px; }
  }

  /* pulsing accent circle */
  .grd-pulse {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(96,165,250,0.15);
    animation: pulseRing 4s ease-out infinite;
  }
  .grd-pulse:nth-child(1) { width: 300px; height: 300px; bottom: -80px; right: -80px; animation-delay: 0s; }
  .grd-pulse:nth-child(2) { width: 500px; height: 500px; bottom: -180px; right: -180px; animation-delay: 1s; }
  .grd-pulse:nth-child(3) { width: 700px; height: 700px; bottom: -280px; right: -280px; animation-delay: 2s; }

  @keyframes pulseRing {
    0%   { opacity: 0.6; }
    50%  { opacity: 0.15; }
    100% { opacity: 0.6; }
  }

  /* floating status dots */
  .grd-dot {
    position: absolute;
    border-radius: 50%;
    animation: floatDot 6s ease-in-out infinite;
  }
  @keyframes floatDot {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-12px); }
  }

  /* form fade-in */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .grd-fadein { animation: fadeUp 0.45s ease both; }
  .grd-fadein-2 { animation: fadeUp 0.45s 0.1s ease both; }
  .grd-fadein-3 { animation: fadeUp 0.45s 0.2s ease both; }

  /* input focus ring */
  .grd-input {
    width: 100%;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 16px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: #0d1f2d;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .grd-input:focus {
    border-color: #60a5fa;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(96,165,250,0.18);
  }
  .grd-input::placeholder { color: #94a3b8; }

  /* primary button */
  .grd-btn {
    width: 100%;
    padding: 13px;
    border-radius: 10px;
    background: #111827;
    color: #fff;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 15px;
    border: none;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: background 0.2s, transform 0.15s;
  }
  .grd-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(96,165,250,0.2), transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .grd-btn:hover { background: #1f2937; }
  .grd-btn:hover::after { opacity: 1; }
  .grd-btn:active { transform: scale(0.985); }
  .grd-btn:disabled { opacity: 0.55; cursor: not-allowed; }

  /* OTP input */
  .grd-otp {
    letter-spacing: 0.35em;
    text-align: center;
    font-size: 20px;
    font-weight: 500;
  }

  /* resend button */
  .grd-resend {
    padding: 12px 16px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    background: #f8fafc;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    color: #0d1f2d;
    cursor: pointer;
    white-space: nowrap;
    transition: border-color 0.2s, background 0.2s;
    flex-shrink: 0;
  }
  .grd-resend:hover:not(:disabled) { border-color: #60a5fa; background: #fff; }
  .grd-resend:disabled { opacity: 0.45; cursor: not-allowed; }

  /* message pill */
  .grd-msg-ok  { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 14px; font-size: 13px; }
  .grd-msg-err { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 14px; font-size: 13px; }

  .grd-overlay {
    position: fixed; inset: 0;
    background: rgba(17,24,39,0.75);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 50;
    animation: fadeUp 0.2s ease both;
  }


`;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [userCredentials, setUserCredentials] = useState(null);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const navigate = useNavigate();

  const ALLOWED_ROLES = ["super_admin", "personnel_admin", "staff_admin"];

  useEffect(() => {
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch {}
      delete window.recaptchaVerifier;
    }
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
        "expired-callback": () => { try { window.recaptchaVerifier.reset(); } catch {} },
      });
    } catch (err) { console.error("reCAPTCHA init error:", err); }
    return () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch {}
        delete window.recaptchaVerifier;
      }
    };
  }, []);

  useEffect(() => {
    let t;
    if (resendCooldown > 0) t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleCredentials = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (!docSnap.exists()) {
        setMessage("error:User data not found.");
        await auth.signOut();
        setLoading(false);
        return;
      }
      const userData = docSnap.data();
      const userRole = userData.role;
      if (!ALLOWED_ROLES.includes(userRole)) {
        setMessage(`error:Access denied. Role "${userRole}" is not permitted.`);
        await auth.signOut();
        setLoading(false);
        return;
      }
      const status = userData.status || "active";
      if (status === "suspended") {
        setMessage("error:Your account has been suspended. Contact support.");
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
      if (status !== "active") {
        setMessage("error:Invalid account status. Contact support.");
        await auth.signOut();
        setLoading(false);
        return;
      }
      const phone = userData.phone;
      if (!phone) {
        setMessage("error:No phone number registered for this account.");
        await auth.signOut();
        setLoading(false);
        return;
      }
      setUserCredentials({ email, password });
      setPhoneNumber(phone);
      await auth.signOut();
      const confirmation = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setStep(2);
      setResendCooldown(30);
      setMessage("success:Verification code sent via SMS.");
    } catch (err) {
      setMessage("error:" + (err.message || "Login failed."));
      try { await auth.signOut(); } catch {}
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!confirmationResult) { setMessage("error:No verification in progress."); return; }
    setLoading(true);
    setMessage("");
    try {
      await confirmationResult.confirm(otp);
      await auth.signOut();
      const userCredential = await signInWithEmailAndPassword(auth, userCredentials.email, userCredentials.password);
      setMessage("success:Verified! Redirecting...");
      const maxWait = 3000; const start = Date.now();
      const waitForRole = async () => {
        const snap = await getDoc(doc(db, "users", userCredential.user.uid));
        if (snap.exists() && snap.data().role) { navigate("/", { replace: true }); }
        else if (Date.now() - start < maxWait) { setTimeout(waitForRole, 200); }
        else { navigate("/", { replace: true }); }
      };
      setTimeout(waitForRole, 500);
    } catch (err) {
      const map = {
        "auth/invalid-verification-code": "error:Invalid verification code.",
        "auth/code-expired": "error:Code expired. Request a new one.",
      };
      setMessage(map[err.code] || "error:Verification failed. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setMessage("");
    try {
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setResendCooldown(30);
      setMessage("success:Code resent. Check your phone.");
    } catch (err) {
      setMessage("error:" + (err.message || "Failed to resend code."));
    } finally { setLoading(false); }
  };

  const handleCancel = async () => {
    setStep(1); setOtp(""); setConfirmationResult(null);
    setMessage(""); setUserCredentials(null);
    try { await auth.signOut(); } catch {}
  };

  const isOk = message.startsWith("success:");
  const msgText = message.replace(/^(success|error):/, "");

  return (
    <>
      <style>{STYLES}</style>

      <div className="grd-root" style={{ display: "flex", minHeight: "100vh" }}>

        {/* ── Left panel ── */}
        <div className="grd-panel-left" style={{
          flex: "0 0 45%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: "48px",
        }}>
          <div className="grd-grid" />
          <div className="grd-pulse" /><div className="grd-pulse" /><div className="grd-pulse" />

          {/* floating status dots */}
          <div className="grd-dot" style={{ width:8, height:8, background:"#60a5fa", top:"22%", left:"18%", animationDelay:"0s" }} />
          <div className="grd-dot" style={{ width:5, height:5, background:"#22d3ee", opacity:0.5, top:"38%", left:"62%", animationDelay:"1.5s" }} />
          <div className="grd-dot" style={{ width:6, height:6, background:"#fff", opacity:0.15, top:"65%", left:"30%", animationDelay:"3s" }} />

          {/* Brand */}
          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:48 }}>
              {/* Logo mark */}
              <div style={{
                width:42, height:42, borderRadius:10,
                background:"linear-gradient(135deg,#60a5fa,#22d3ee)",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 4px 20px rgba(96,165,250,0.35)",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0d1f2d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
              </div>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:"#fff", letterSpacing:"-0.02em" }}>
                GARDIAN
              </span>
            </div>

            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:38, color:"#fff", lineHeight:1.15, letterSpacing:"-0.03em", marginBottom:16 }}>
              Infrastructure<br />
              <span style={{ color:"#60a5fa" }}>Management</span><br />
              System
            </h2>
            <p style={{ color:"rgba(255,255,255,0.45)", fontSize:14, lineHeight:1.7, maxWidth:300 }}>
              Real-time monitoring and reporting platform for public infrastructure management in Cainta, Calabarzon.
            </p>
          </div>

          {/* MENRO text */}
          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{
              borderLeft: "3px solid #60a5fa",
              paddingLeft: 16,
            }}>
              <p style={{ fontSize:11, fontWeight:600, color:"#60a5fa", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:6 }}>
                Operated by
              </p>
              <p style={{ fontSize:15, fontWeight:600, color:"#fff", lineHeight:1.55 }}>
                Municipal Environment and<br />Natural Resources Office
              </p>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:4 }}>
                Cainta, Rizal · Calabarzon
              </p>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{
          flex:1, background:"#fff", display:"flex",
          alignItems:"center", justifyContent:"center", padding:"48px 40px",
        }}>
          <div style={{ width:"100%", maxWidth:400 }}>

            {step === 1 && (
              <div key="step1" className="grd-fadein">
                <p style={{ fontSize:13, color:"#94a3b8", marginBottom:6, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                  Admin Portal
                </p>
                <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:30, color:"#111827", marginBottom:8, letterSpacing:"-0.025em" }}>
                  Welcome back
                </h1>
                <p style={{ color:"#94a3b8", fontSize:14, marginBottom:36 }}>
                  Sign in to your administrator account
                </p>

                <form onSubmit={handleCredentials} style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  {/* Email */}
                  <div>
                    <label style={{ display:"block", fontSize:13, fontWeight:500, color:"#475569", marginBottom:6 }}>
                      Email address
                    </label>
                    <input
                      className="grd-input"
                      type="email"
                      placeholder="admin@gardian.ph"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label style={{ display:"block", fontSize:13, fontWeight:500, color:"#475569", marginBottom:6 }}>
                      Password
                    </label>
                    <div style={{ position:"relative" }}>
                      <input
                        className="grd-input"
                        type={showPass ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ paddingRight:44 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        style={{
                          position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
                          background:"none", border:"none", cursor:"pointer", padding:0,
                          color:"#94a3b8", display:"flex", alignItems:"center",
                        }}
                        tabIndex={-1}
                      >
                        {showPass ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button className="grd-btn" type="submit" disabled={loading} style={{ marginTop:4 }}>
                    {loading ? (
                      <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                        <span style={{
                          width:16, height:16, border:"2px solid rgba(255,255,255,0.3)",
                          borderTopColor:"#fff", borderRadius:"50%",
                          animation:"spin 0.7s linear infinite", display:"inline-block",
                        }} />
                        Signing in...
                      </span>
                    ) : "Sign in →"}
                  </button>
                </form>

                {message && (
                  <div className={isOk ? "grd-msg-ok" : "grd-msg-err"} style={{ marginTop:16 }}>
                    {msgText}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div key="step2" className="grd-fadein">
                {/* Back */}
                <button onClick={handleCancel} style={{
                  display:"flex", alignItems:"center", gap:6,
                  background:"none", border:"none", cursor:"pointer",
                  color:"#94a3b8", fontSize:13, padding:0, marginBottom:32,
                  fontFamily:"'DM Sans',sans-serif",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
                  </svg>
                  Back to login
                </button>

                {/* Phone icon */}
                <div style={{
                  width:56, height:56, borderRadius:14,
                  background:"linear-gradient(135deg,#ecfdf5,#d1fae5)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  marginBottom:20,
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                  </svg>
                </div>

                <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, color:"#111827", marginBottom:8, letterSpacing:"-0.025em" }}>
                  Verify your identity
                </h1>
                <p style={{ color:"#94a3b8", fontSize:14, marginBottom:32, lineHeight:1.6 }}>
                  A 6-digit code was sent to<br />
                  <strong style={{ color:"#111827" }}>{phoneNumber}</strong>
                </p>

                <form onSubmit={handleVerify} style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  <div>
                    <label style={{ display:"block", fontSize:13, fontWeight:500, color:"#475569", marginBottom:6 }}>
                      Verification code
                    </label>
                    <input
                      className="grd-input grd-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="· · · · · ·"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </div>

                  <div style={{ display:"flex", gap:10 }}>
                    <button className="grd-btn" type="submit" disabled={loading || otp.length < 6}>
                      {loading ? (
                        <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                          <span style={{
                            width:16, height:16, border:"2px solid rgba(255,255,255,0.3)",
                            borderTopColor:"#fff", borderRadius:"50%",
                            animation:"spin 0.7s linear infinite", display:"inline-block",
                          }} />
                          Verifying...
                        </span>
                      ) : "Verify →"}
                    </button>
                    <button
                      type="button"
                      className="grd-resend"
                      onClick={handleResend}
                      disabled={loading || resendCooldown > 0}
                    >
                      {resendCooldown > 0 ? `${resendCooldown}s` : "Resend"}
                    </button>
                  </div>
                </form>

                {message && (
                  <div className={isOk ? "grd-msg-ok" : "grd-msg-err"} style={{ marginTop:16 }}>
                    {msgText}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <p style={{ marginTop:40, fontSize:12, color:"#cbd5e1", textAlign:"center" }}>
              GARDIAN © 2026 · Cainta, Calabarzon · Admin access only
            </p>
          </div>
        </div>
      </div>

      {/* ── Pending Modal ── */}
      {showPendingModal && (
        <div className="grd-overlay">
          <div style={{
            background:"#fff", borderRadius:20, padding:"40px 36px",
            width:"100%", maxWidth:420, boxShadow:"0 24px 60px rgba(13,31,45,0.3)",
            margin:"0 16px",
          }}>
            <div style={{
              width:64, height:64, borderRadius:16,
              background:"linear-gradient(135deg,#fffbeb,#fef3c7)",
              display:"flex", alignItems:"center", justifyContent:"center",
              margin:"0 auto 20px",
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, color:"#111827", textAlign:"center", marginBottom:10, letterSpacing:"-0.025em" }}>
              Account Pending
            </h2>
            <p style={{ color:"#64748b", fontSize:14, lineHeight:1.7, textAlign:"center", marginBottom:28 }}>
              Your admin account is currently awaiting approval. Please check back later or contact your system administrator.
            </p>
            <button
              className="grd-btn"
              onClick={() => setShowPendingModal(false)}
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      <div id="recaptcha-container" />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .grd-panel-left { display: none !important; }
        }
      `}</style>
    </>
  );
}