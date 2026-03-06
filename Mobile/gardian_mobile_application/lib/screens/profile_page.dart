import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';
import '../services/auth_services.dart';
import '../services/firestore_service.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();

  String? _selectedBarangay;
  String _memberSince = "";

  // Storage for original values for "Cancel/Revert"
  String _origFirstName = "";
  String _origLastName = "";
  String _origPhone = "";
  String? _origBarangay;

  bool _isLoading = true;
  bool _isEditing = false;
  bool _isSaving = false;

  final List<String> _barangays = [
    "San Andres (Poblacion)",
    "San Juan",
    "San Jose",
    "Poblacion",
    "Santo Niño",
  ];

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    final uid = authService.value.currentUser?.uid;
    if (uid != null) {
      DocumentSnapshot doc = await firestoreService.getUserData(uid);
      if (doc.exists) {
        final data = doc.data() as Map<String, dynamic>;
        setState(() {
          _origFirstName = data['firstName'] ?? "";
          _origLastName = data['lastName'] ?? "";
          _origPhone = data['phone'] ?? "";
          _origBarangay = data['barangay'];

          _firstNameController.text = _origFirstName;
          _lastNameController.text = _origLastName;
          _phoneController.text = _origPhone;
          _selectedBarangay = _origBarangay;

          if (data['createdAt'] != null) {
            Timestamp t = data['createdAt'];
            _memberSince = DateFormat('MMMM dd, yyyy').format(t.toDate());
          }
          _isLoading = false;
        });
      }
    }
  }

  void _cancelEdit() {
    setState(() {
      _firstNameController.text = _origFirstName;
      _lastNameController.text = _origLastName;
      _phoneController.text = _origPhone;
      _selectedBarangay = _origBarangay;
      _isEditing = false;
    });
  }

  // 🔐 Logic for Changing Password using your AuthService
  void _showChangePasswordDialog() {
    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(
          "Change Password",
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: currentPasswordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: "Current Password"),
            ),
            TextField(
              controller: newPasswordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: "New Password"),
            ),
            TextField(
              controller: confirmPasswordController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: "Confirm New Password",
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () async {
              if (newPasswordController.text !=
                  confirmPasswordController.text) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("New passwords do not match!")),
                );
                return;
              }
              try {
                await authService.value.resetPasswordFromCurrentPassword(
                  currentPassword: currentPasswordController.text,
                  newPassword: newPasswordController.text,
                  email: authService.value.currentUser!.email!,
                );
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text("Password updated successfully!"),
                  ),
                );
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text("Error: ${e.toString()}")),
                );
              }
            },
            child: const Text("Update"),
          ),
        ],
      ),
    );
  }

  Future<void> _saveProfile() async {
    setState(() => _isSaving = true);
    try {
      final uid = authService.value.currentUser?.uid;
      await firestoreService.updateUserProfile(
        uid: uid!,
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        phone: _phoneController.text.trim(),
        barangay: _selectedBarangay ?? "San Andres",
      );

      _origFirstName = _firstNameController.text.trim();
      _origLastName = _lastNameController.text.trim();
      _origPhone = _phoneController.text.trim();
      _origBarangay = _selectedBarangay;

      setState(() => _isEditing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Profile updated successfully!")),
      );
    } catch (e) {
      debugPrint("Update error: $e");
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading)
      return const Scaffold(body: Center(child: CircularProgressIndicator()));

    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        child: Column(
          children: [
            // --- HEADER UI ---
            Container(
              padding: const EdgeInsets.fromLTRB(20, 30, 20, 30),
              decoration: const BoxDecoration(color: Color(0xFF122D5A)),
              child: Row(
                children: [
                  const CircleAvatar(
                    radius: 45,
                    backgroundColor: Colors.white,
                    child: CircleAvatar(
                      radius: 42,
                      backgroundImage: AssetImage(
                        "assets/icons/user_avatar.png",
                      ),
                    ),
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "${_firstNameController.text} ${_lastNameController.text}",
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          "Barangay: ${_selectedBarangay ?? 'Not Set'}",
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          "Member Since: $_memberSince",
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // --- FORM FIELDS ---
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  _buildField(
                    "Your Email",
                    TextEditingController(
                      text: authService.value.currentUser?.email,
                    ),
                    Icons.email_outlined,
                    enabled: false,
                  ),
                  _buildField(
                    "First Name",
                    _firstNameController,
                    Icons.person_outline,
                    enabled: _isEditing,
                  ),
                  _buildField(
                    "Last Name",
                    _lastNameController,
                    Icons.person_outline,
                    enabled: _isEditing,
                  ),

                  // Barangay Dropdown
                  Padding(
                    padding: const EdgeInsets.only(bottom: 15),
                    child: DropdownButtonFormField<String>(
                      value: _selectedBarangay,
                      decoration: _inputDecoration(
                        "Barangay",
                        Icons.location_city_outlined,
                      ),
                      items: _barangays
                          .map(
                            (b) => DropdownMenuItem(value: b, child: Text(b)),
                          )
                          .toList(),
                      onChanged: _isEditing
                          ? (val) => setState(() => _selectedBarangay = val)
                          : null,
                    ),
                  ),

                  _buildField(
                    "Phone Number",
                    _phoneController,
                    Icons.phone_android_outlined,
                    enabled: _isEditing,
                  ),

                  // 🔹 CHANGE PASSWORD BUTTON (Replaces Field)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 15),
                    child: OutlinedButton.icon(
                      onPressed: _isEditing ? _showChangePasswordDialog : null,
                      icon: const Icon(Icons.lock_reset),
                      label: const Text("Change Password"),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(double.infinity, 55),
                        foregroundColor: _isEditing
                            ? const Color(0xFF122D5A)
                            : Colors.grey,
                        side: BorderSide(
                          color: _isEditing
                              ? const Color(0xFF122D5A)
                              : Colors.grey.shade300,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // --- ACTION BUTTONS ---
                  if (!_isEditing)
                    ElevatedButton(
                      onPressed: () => setState(() => _isEditing = true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF8BC34A),
                        minimumSize: const Size(double.infinity, 55),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        "Edit",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    )
                  else
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _isSaving ? null : _cancelEdit,
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(double.infinity, 55),
                              side: const BorderSide(color: Colors.redAccent),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text(
                              "Cancel",
                              style: TextStyle(
                                color: Colors.redAccent,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 15),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _isSaving ? null : _saveProfile,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF8BC34A),
                              minimumSize: const Size(double.infinity, 55),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: _isSaving
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Text(
                                    "Save",
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildField(
    String label,
    TextEditingController controller,
    IconData icon, {
    bool enabled = true,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 15),
      child: TextFormField(
        controller: controller,
        enabled: enabled,
        decoration: _inputDecoration(label, icon),
      ),
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, color: Colors.grey),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      disabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      filled: true,
      fillColor: _isEditing ? Colors.white : Colors.grey.shade50,
    );
  }
}
