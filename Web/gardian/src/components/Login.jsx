import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const actionCodeSettings = {
  url: window.location.origin + "/login",
  handleCodeInApp: true,
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let storedEmail = window.localStorage.getItem("emailForSignIn");
      if (!storedEmail) {
        storedEmail = window.prompt("Please enter your email for confirmation:");
      }

      setLoading(true);

      signInWithEmailLink(auth, storedEmail, window.location.href)
        .then(async (result) => {
          const uid = result.user.uid;

          // Fetch user by UID
          const docRef = doc(db, "users", uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists() && docSnap.data().role === "admin") {
            setMessage("✅ Logged in as admin!");
            window.localStorage.removeItem("emailForSignIn");

            // Redirect to dashboard
            window.location.href = "/";
          } else {
            setMessage("❌ Not authorized.");
            auth.signOut();
          }
        })
        .catch((err) => setMessage("❌ " + err.message))
        .finally(() => setLoading(false));
    }
  }, []);

  const handleSendLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      setMessage("✅ Check your email for the sign-in link.");
    } catch (error) {
      setMessage("❌ " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#F5EEDD]">
      <div className="bg-white p-8 rounded-2xl shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#06202B]">
          Admin Login
        </h2>
        <form onSubmit={handleSendLink} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full border p-2 rounded-md"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-[#077A7D] text-white py-2 rounded-md hover:bg-[#06202B]"
            disabled={loading}
          >
            {loading ? "Processing..." : "Send Login Link"}
          </button>
        </form>
        {message && <p className="mt-4 text-center text-sm">{message}</p>}
      </div>
    </div>
  );
}
