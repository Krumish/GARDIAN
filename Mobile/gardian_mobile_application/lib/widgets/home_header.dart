import 'package:flutter/material.dart';
import '../services/auth_services.dart';

class HomeHeader extends StatelessWidget {
  const HomeHeader({super.key});

  @override
  Widget build(BuildContext context) {
    final user = authService.value.currentUser;
    final displayName = user?.displayName ?? "User";
    const navyColor = Color(0xFF122D5A);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.only(top: 30, bottom: 30, left: 20, right: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // 🔹 Greeting & Name
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Good Day,",
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  displayName,
                  style: const TextStyle(
                    color: navyColor,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -0.5,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),

          // 🔹 Avatar Profile
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: navyColor.withOpacity(0.2), width: 2),
            ),
            child: const CircleAvatar(
              radius: 26,
              backgroundImage: AssetImage("assets/icons/user_avatar.png"),
              backgroundColor:
                  Colors.transparent, // Prevents white box on transparent PNGs
            ),
          ),
        ],
      ),
    );
  }
}
