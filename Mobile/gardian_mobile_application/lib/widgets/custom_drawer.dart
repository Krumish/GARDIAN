import 'package:flutter/material.dart';
import '../auth_wrapper.dart';
import '../services/auth_services.dart';

class CustomDrawer extends StatelessWidget {
  final int selectedIndex;
  final Function(int) onItemTapped;

  const CustomDrawer({
    super.key,
    required this.selectedIndex,
    required this.onItemTapped,
  });

  @override
  Widget build(BuildContext context) {
    final user = authService.value.currentUser;

    return Drawer(
      child: Container(
        // 🔹 Unified the dark blue color to match your Auth pages
        color: const Color(0xFF162447),
        child: Column(
          children: [
            // 🔹 Custom, modern Header instead of the default UserAccountsDrawerHeader
            Container(
              width: double.infinity,
              padding: const EdgeInsets.only(
                top: 60,
                bottom: 20,
                left: 24,
                right: 24,
              ),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.1), // Subtle contrast
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  GestureDetector(
                    onTap: () {
                      Navigator.pop(context); // Close drawer
                      onItemTapped(4); // Index 4 is Profile
                    },
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.green,
                          width: 2,
                        ), // Nice accent ring
                      ),
                      child: const CircleAvatar(
                        radius: 36,
                        backgroundColor: Colors.white,
                        backgroundImage: AssetImage(
                          "assets/icons/user_avatar.png",
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    user?.displayName ?? "GARDIAN User",
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.email ?? "Online",
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.7),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 🔹 Scrollable Menu Items
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  _drawerItem(context, Icons.home, "Home", 0),
                  _drawerItem(context, Icons.person, "Profile", 4),
                  _drawerItem(context, Icons.feedback, "Send Feedback", 1),
                  _drawerItem(context, Icons.call, "Contact Us", 2),
                  _drawerItem(context, Icons.info_outline, "About", 3),
                ],
              ),
            ),

            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 24),
              child: Divider(color: Colors.white24, height: 1),
            ),

            // 🚪 Log Out
            Padding(
              padding: const EdgeInsets.all(12.0),
              child: ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                leading: const Icon(Icons.logout, color: Colors.redAccent),
                title: const Text(
                  "Log Out",
                  style: TextStyle(
                    color: Colors.redAccent,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                onTap: () async {
                  // 1. Close the drawer
                  Navigator.pop(context);

                  // 2. Perform sign out
                  await authService.value.signOut();

                  // 3. Ensure the context is still valid after the async call
                  if (!context.mounted) return;

                  // 4. Clear the entire navigation stack and reset to AuthWrapper
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(
                      builder: (context) => const AuthWrapper(),
                    ),
                    (Route<dynamic> route) =>
                        false, // This destroys all previous routes
                  );
                },
              ),
            ),
            const SizedBox(height: 12), // Bottom safe area padding
          ],
        ),
      ),
    );
  }

  // 🔹 Passed BuildContext so we can pop the drawer on tap
  Widget _drawerItem(
    BuildContext context,
    IconData icon,
    String text,
    int index,
  ) {
    bool isSelected = selectedIndex == index;

    return Padding(
      // 🔹 Added horizontal padding for the modern "floating pill" look
      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 4.0),
      child: ListTile(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        leading: Icon(icon, color: isSelected ? Colors.green : Colors.white),
        title: Text(
          text,
          style: TextStyle(
            color: isSelected ? Colors.green : Colors.white,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          ),
        ),
        selected: isSelected,
        selectedTileColor: Colors.white.withOpacity(0.08),
        onTap: () {
          Navigator.pop(context);
          onItemTapped(index);
        },
      ),
    );
  }
}
