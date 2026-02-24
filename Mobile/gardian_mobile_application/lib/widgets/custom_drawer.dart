import 'package:flutter/material.dart';
import '../services/auth_services.dart';

class CustomDrawer extends StatelessWidget {
  // 🔹 New: These allow the drawer to communicate with the MainWrapper
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
        color: const Color(0xFF122D5A),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            UserAccountsDrawerHeader(
              decoration: const BoxDecoration(color: Color(0xFF122D5A)),
              currentAccountPicture: GestureDetector(
                onTap: () {
                  Navigator.pop(context); // Close drawer
                  onItemTapped(4); // Index 4 is Profile
                },
                child: const CircleAvatar(
                  backgroundColor: Colors.white24,
                  backgroundImage: AssetImage("assets/icons/user_avatar.png"),
                ),
              ),
              accountName: Text(
                user?.displayName ?? "GARDIAN User",
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              accountEmail: Text(
                user?.email ?? "Online",
                style: const TextStyle(color: Colors.greenAccent),
              ),
            ),

            // 🏠 Home
            _drawerItem(Icons.home, "Home", 0),

            // 👤 Profile
            _drawerItem(Icons.person, "Profile", 4),

            // 💬 Feedback
            _drawerItem(Icons.feedback, "Send Feedback", 1),

            // 📞 Contact
            _drawerItem(Icons.call, "Contact Us", 2),

            // ℹ️ About
            _drawerItem(Icons.info_outline, "About", 3),

            const Divider(color: Colors.white54, indent: 20, endIndent: 20),

            // 🚪 Log Out
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.white),
              title: const Text(
                "Log Out",
                style: TextStyle(color: Colors.white),
              ),
              onTap: () async {
                Navigator.pop(context);

                Navigator.of(context).popUntil((route) => route.isFirst);

                await authService.value.signOut();
              },
            ),
          ],
        ),
      ),
    );
  }

  // 🔹 Updated Helper: Handles the index switching
  Widget _drawerItem(IconData icon, String text, int index) {
    // Check if this item is the one currently selected
    bool isSelected = selectedIndex == index;

    return ListTile(
      leading: Icon(
        icon,
        color: isSelected ? Colors.greenAccent : Colors.white,
      ),
      title: Text(
        text,
        style: TextStyle(
          color: isSelected ? Colors.greenAccent : Colors.white,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      // Background highlight for the selected item
      selected: isSelected,
      selectedTileColor: Colors.white.withOpacity(0.1),
      onTap: () {
        onItemTapped(index);
      },
    );
  }
}
