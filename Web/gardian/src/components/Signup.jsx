import { useState } from "react";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create a dummy password account to generate uid
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        "TemporaryPassword123!"
      );
      const uid = userCredential.user.uid;

      // Save user to Firestore using UID (required by your rules)
      await setDoc(doc(db, "users", uid), {
        email,
        role,
        createdAt: serverTimestamp(),
      });

      setMessage(`✅ User created successfully as ${role}`);
      setEmail("");
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
          Temporary Signup
        </h2>
        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full border p-2 rounded-md"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border p-2 rounded-md"
          >
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            className="w-full bg-[#077A7D] text-white py-2 rounded-md hover:bg-[#06202B]"
            disabled={loading}
          >
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>
        {message && <p className="mt-4 text-center text-sm">{message}</p>}
      </div>
    </div>
  );
}
