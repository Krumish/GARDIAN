import { useUser } from "../context/UserContext";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ component: Component, allowedRoles }) {
  const { user, role, loading } = useUser();

  console.log("🛡️ ProtectedRoute check:", {
    loading,
    hasUser: !!user,
    userRole: role,
    allowedRoles,
    isRoleAllowed: allowedRoles.includes(role)
  });

  // While auth state is loading
  if (loading) {
    console.log("⏳ Still loading auth state...");
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // Not logged in
  if (!user) {
    console.log("❌ No user found, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // User role not allowed
  if (!allowedRoles.includes(role)) {
    console.log(`❌ Role "${role}" not in allowed roles:`, allowedRoles);
    return <Navigate to="/login" replace />;
  }

  console.log("✅ Access granted!");
  // Everything ok, render the component
  return <Component />;
}