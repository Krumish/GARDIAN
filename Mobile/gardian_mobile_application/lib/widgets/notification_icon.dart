import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../services/auth_services.dart';

class NotificationIconButton extends StatelessWidget {
  final VoidCallback onPressed;

  const NotificationIconButton({super.key, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    final uid = authService.value.currentUser?.uid;

    if (uid == null) {
      return IconButton(
        icon: const Icon(Icons.notifications_none, color: Colors.white),
        onPressed: onPressed,
      );
    }

    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection("users")
          .doc(uid)
          .collection("notifications")
          .where("read", isEqualTo: false)
          .snapshots(),
      builder: (context, snapshot) {
        final unreadCount = snapshot.data?.docs.length ?? 0;

        return Stack(
          children: [
            IconButton(
              icon: const Icon(Icons.notifications_none, color: Colors.white),
              onPressed: onPressed,
            ),

            // 🔴 RED DOT
            if (unreadCount > 0)
              Positioned(
                right: 10,
                top: 10,
                child: Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
