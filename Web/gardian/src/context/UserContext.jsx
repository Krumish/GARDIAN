import { createContext, useContext, useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      console.log("🔄 Auth state changed:", currentUser?.uid || "No user");
      
      if (currentUser) {
        setUser(currentUser);
        
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userRole = userData.role;
            
            console.log("📱 UserContext - Full user data:", userData);
            console.log("👤 UserContext - Role extracted:", userRole);
            
            setRole(userRole);
            console.log("✅ Auth state loading complete. User:", currentUser.uid, "Role:", userRole);
          } else {
            console.log("❌ UserContext - User document not found");
            setRole(null);
          }
        } catch (error) {
          console.error("❌ Error fetching user data:", error);
          setRole(null);
        }
      } else {
        console.log("🚪 User logged out");
        setUser(null);
        setRole(null);
        console.log("✅ Auth cleared");
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []); // ✅ Empty dependency array is correct

  return (
    <UserContext.Provider value={{ user, role, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);