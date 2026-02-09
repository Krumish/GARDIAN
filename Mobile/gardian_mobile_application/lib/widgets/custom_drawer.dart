import 'package:flutter/material.dart';
import '../screens/home/about_page.dart';
import '../services/auth_services.dart';
import '../screens/home/home_page.dart';
import '../screens/feedback_page.dart';
import '../screens/contact_page.dart';

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
                backgroundImage: AssetImage("assets/icons/user_avatar.png"),
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
              _navigate(context, const HomePage());
            }),

            _drawerItem(Icons.feedback, "Send Feedback", () {
              _navigate(context, const FeedbackPage());
            }),

            _drawerItem(Icons.call, "Contact Us", () {
              _navigate(context, const ContactPage());
            }),

            _drawerItem(Icons.info_outline, "About", () {
              _navigate(context, const AboutPage());
            }),

            const Divider(color: Colors.white54),

            _drawerItem(Icons.logout, "Log Out", () async {
              await authService.value.signOut();
            }),
          ],
        ),
      ),
    );
  }

  void _navigate(BuildContext context, Widget page) {
    Navigator.pop(context); // close drawer
    Navigator.push(context, MaterialPageRoute(builder: (_) => page));
  }

  Widget _drawerItem(IconData icon, String text, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: Colors.white),
      title: Text(text, style: const TextStyle(color: Colors.white)),
      onTap: onTap,
    );
  }
}
