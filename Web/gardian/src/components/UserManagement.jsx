import { useState, useEffect } from "react";
import { FaSearch, FaUserPlus, FaEdit, FaTrash, FaFilter } from "react-icons/fa";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  
  // ✅ Define admin roles (must match Login.jsx)
  const ADMIN_ROLES = ["super_admin", "personnel_admin", "staff_admin"];
  
  // Add user form
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    status: "active",
    role: "personnel_admin" // Default role
  });

  // Edit user form
  const [editUser, setEditUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    status: "",
    role: ""
  });

  // Fetch all admin users in real-time
  useEffect(() => {
    const usersRef = collection(db, "users");
    
    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        const allUsers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Filter only admin users (any of the three admin roles)
        const adminUsers = allUsers.filter(user => ADMIN_ROLES.includes(user.role));
        setUsers(adminUsers);
      },
      (error) => {
        console.error("❌ Error fetching users:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtered users based on search, status, and role
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.firstName || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.lastName || "").toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || (u.status || "active") === statusFilter;
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Helper to format date and time
  const formatDateTime = (ts) => {
    if (!ts) return "-";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to format role display name
  const formatRoleName = (role) => {
    const roleNames = {
      super_admin: "Super Admin",
      personnel_admin: "Personnel Admin",
      staff_admin: "Staff Admin"
    };
    return roleNames[role] || role;
  };

  // Add new admin user
  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.firstName || !newUser.lastName) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      // Store current user before creating new one
      const currentUser = auth.currentUser;
      
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUser.email,
        newUser.password
      );

      // Use the new user's UID as the document ID
      const newUserUid = userCredential.user.uid;
      
      // Add user document to Firestore with the UID as document ID
      await setDoc(doc(db, "users", newUserUid), {
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phone: newUser.phone,
        status: newUser.status,
        role: newUser.role, // ✅ Now uses the selected role
        createdAt: new Date(),
      });

      // Sign out the newly created user and sign back in as the admin
      await auth.signOut();
      
      setShowAddModal(false);
      setNewUser({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        status: "active",
        role: "personnel_admin"
      });
      
      alert("Admin user created successfully! Please log back in.");
      
    } catch (err) {
      console.error("Error adding user:", err);
      alert(`Failed to add user: ${err.message}`);
    }
  };

  // Update user details
  const handleEditUser = async () => {
    if (!showEditModal) return;

    try {
      const userRef = doc(db, "users", showEditModal.id);
      
      // Build update object with only defined values
      const updateData = {
        firstName: editUser.firstName,
        lastName: editUser.lastName,
        phone: editUser.phone || "",
        status: editUser.status,
        role: editUser.role // ✅ Include role in update
      };

      // Only update email if it changed
      if (editUser.email !== showEditModal.email) {
        updateData.email = editUser.email;
      }

      await updateDoc(userRef, updateData);

      setShowEditModal(null);
      setEditUser({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        status: "",
        role: ""
      });
      
      alert("User updated successfully!");
    } catch (err) {
      console.error("Error updating user:", err);
      alert(`Failed to update user: ${err.message}`);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!showDeleteModal) return;

    try {
      const userRef = doc(db, "users", showDeleteModal.id);
      await deleteDoc(userRef);
      setShowDeleteModal(null);
      alert("User deleted successfully!");
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Failed to delete user");
    }
  };

  // Open edit modal
  const openEditModal = (user) => {
    setEditUser({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || "",
      status: user.status || "active",
      role: user.role || "personnel_admin"
    });
    setShowEditModal(user);
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const colors = {
      active: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      suspended: "bg-red-100 text-red-700"
    };
    return colors[status] || colors.active;
  };

  // Get role badge color
  const getRoleBadge = (role) => {
    const colors = {
      super_admin: "bg-purple-100 text-purple-700",
      personnel_admin: "bg-blue-100 text-blue-700",
      staff_admin: "bg-indigo-100 text-indigo-700"
    };
    return colors[role] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border rounded-xl p-6 shadow hover:shadow-lg transition">
          <h3 className="text-sm text-gray-500">Total Admins</h3>
          <p className="text-3xl font-bold mt-2">{users.length}</p>
        </div>
        <div className="bg-white border rounded-xl p-6 shadow hover:shadow-lg transition">
          <h3 className="text-sm text-gray-500">Super Admins</h3>
          <p className="text-3xl font-bold mt-2 text-purple-500">
            {users.filter(u => u.role === "super_admin").length}
          </p>
        </div>
        <div className="bg-white border rounded-xl p-6 shadow hover:shadow-lg transition">
          <h3 className="text-sm text-gray-500">Personnel Admins</h3>
          <p className="text-3xl font-bold mt-2 text-blue-500">
            {users.filter(u => u.role === "personnel_admin").length}
          </p>
        </div>
        <div className="bg-white border rounded-xl p-6 shadow hover:shadow-lg transition">
          <h3 className="text-sm text-gray-500">Staff Admins</h3>
          <p className="text-3xl font-bold mt-2 text-indigo-500">
            {users.filter(u => u.role === "staff_admin").length}
          </p>
        </div>
      </div>

      {/* Search, Filter, and Add User Section */}
      <div className="bg-white border border-gray-200 rounded-xl shadow p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search Bar */}
          <div className="relative w-full lg:w-96">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {/* Filter Button */}
            <button
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-300 transition"
              onClick={() => setShowFilterModal(!showFilterModal)}
            >
              <FaFilter /> Filter
            </button>

            {/* Add User Button */}
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition"
              onClick={() => setShowAddModal(true)}
            >
              <FaUserPlus /> Add New User
            </button>
          </div>
        </div>

        {/* Filter Dropdown */}
        {showFilterModal && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Status
                </label>
                <select
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Role
                </label>
                <select
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="personnel_admin">Personnel Admin</option>
                  <option value="staff_admin">Staff Admin</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-600 text-sm border-b">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b hover:bg-gray-50 text-sm"
                >
                  <td className="py-3 px-4">
                    <div className="font-medium">
                      {user.firstName} {user.lastName}
                    </div>
                  </td>
                  <td className="py-3 px-4">{user.email}</td>
                  <td className="py-3 px-4">{user.phone || "-"}</td>
                  <td className="py-3 px-4">
                    <span className={`${getStatusBadge(user.status || "active")} px-2 py-1 rounded-full text-xs font-medium capitalize`}>
                      {user.status || "active"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`${getRoleBadge(user.role)} px-2 py-1 rounded-full text-xs font-medium`}>
                      {formatRoleName(user.role)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {formatDateTime(user.createdAt)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        className="text-blue-500 hover:text-blue-700"
                        onClick={() => openEditModal(user)}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => setShowDeleteModal(user)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="text-center py-4 text-gray-500 italic"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Add New Admin User</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewUser({
                    email: "",
                    password: "",
                    firstName: "",
                    lastName: "",
                    phone: "",
                    status: "active",
                    role: "personnel_admin"
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter first name"
                    className="border border-gray-300 rounded-lg px-4 py-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter last name"
                    className="border border-gray-300 rounded-lg px-4 py-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  className="border border-gray-300 rounded-lg px-4 py-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter password (min. 6 characters)"
                  className="border border-gray-300 rounded-lg px-4 py-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="Enter phone number (e.g., +639123456789)"
                  className="border border-gray-300 rounded-lg px-4 py-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required for 2FA login verification
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Role <span className="text-red-500">*</span>
                </label>
                <select
                  className="border border-gray-300 rounded-lg px-4 py-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="personnel_admin">Personnel Admin</option>
                  <option value="staff_admin">Staff Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {newUser.role === "super_admin" && "Full access to all features including user management"}
                  {newUser.role === "personnel_admin" && "Access to dashboard, analytics, reports, and feedback"}
                  {newUser.role === "staff_admin" && "Access to reports only"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Status
                </label>
                <select
                  className="border border-gray-300 rounded-lg px-4 py-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newUser.status}
                  onChange={(e) => setNewUser({...newUser, status: e.target.value})}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Set initial account status for this user
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 transition font-medium"
                onClick={() => {
                  setShowAddModal(false);
                  setNewUser({
                    email: "",
                    password: "",
                    firstName: "",
                    lastName: "",
                    phone: "",
                    status: "active",
                    role: "personnel_admin"
                  });
                }}
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-blue-500 text-white px-4 py-2.5 rounded-lg hover:bg-blue-600 transition font-medium"
                onClick={handleAddUser}
              >
                Create Admin User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Edit User</h3>
              <button
                onClick={() => setShowEditModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="First Name"
                    className="border border-gray-300 rounded-lg px-4 py-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editUser.firstName}
                    onChange={(e) => setEditUser({...editUser, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    className="border border-gray-300 rounded-lg px-4 py-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editUser.lastName}
                    onChange={(e) => setEditUser({...editUser, lastName: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Email"
                  className="border border-gray-300 rounded-lg px-4 py-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={editUser.email}
                  onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="Phone"
                  className="border border-gray-300 rounded-lg px-4 py-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={editUser.phone}
                  onChange={(e) => setEditUser({...editUser, phone: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Role
                </label>
                <select
                  className="border border-gray-300 rounded-lg px-4 py-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={editUser.role}
                  onChange={(e) => setEditUser({...editUser, role: e.target.value})}
                >
                  <option value="personnel_admin">Personnel Admin</option>
                  <option value="staff_admin">Staff Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {editUser.role === "super_admin" && "Full access to all features"}
                  {editUser.role === "personnel_admin" && "Access to dashboard, analytics, reports, and feedback"}
                  {editUser.role === "staff_admin" && "Access to reports only"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Status
                </label>
                <select
                  className="border border-gray-300 rounded-lg px-4 py-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={editUser.status}
                  onChange={(e) => setEditUser({...editUser, status: e.target.value})}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 transition font-medium"
                onClick={() => setShowEditModal(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-blue-500 text-white px-4 py-2.5 rounded-lg hover:bg-blue-600 transition font-medium"
                onClick={handleEditUser}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <FaTrash className="text-red-600 text-2xl" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-gray-800">Delete User</h3>
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete <strong>{showDeleteModal.firstName} {showDeleteModal.lastName}</strong>?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                This action cannot be undone. All user data will be permanently removed.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 transition font-medium"
                onClick={() => setShowDeleteModal(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-red-500 text-white px-4 py-2.5 rounded-lg hover:bg-red-600 transition font-medium"
                onClick={handleDeleteUser}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
       