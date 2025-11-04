import 'package:flutter/material.dart';
import '../services/auth_services.dart';

class CustomDrawer extends StatelessWidget {
  const CustomDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: Container(
        color: const Color(0xFF122D5A),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            UserAccountsDrawerHeader(
              decoration: const BoxDecoration(color: Color(0xFF122D5A)),
              currentAccountPicture: const CircleAvatar(
                backgroundImage: AssetImage(
                  "assets/icons/user_avatar.png",
                ), // placeholder
              ),
              accountName: const Text(
                "User",
                style: TextStyle(color: Colors.white, fontSize: 16),
              ),
              accountEmail: const Text(
                "Online",
                style: TextStyle(color: Colors.greenAccent),
              ),
            ),
            _drawerItem(Icons.home, "Home", () {
              Navigator.pop(context);
            }),
            _drawerItem(Icons.feedback, "Send Feedback", () {}),
            _drawerItem(Icons.call, "Contact Us", () {}),
            _drawerItem(Icons.info_outline, "About", () {}),
            _drawerItem(Icons.logout, "Log Out", () async {
              await authService.value.signOut();
            }),
          ],
        ),
      ),
    );
  }

  Widget _drawerItem(IconData icon, String text, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: Colors.white),
      title: Text(text, style: const TextStyle(color: Colors.white)),
      onTap: onTap,
    );
  }
}
