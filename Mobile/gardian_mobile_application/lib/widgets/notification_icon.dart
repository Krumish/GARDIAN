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
          .limit(1)
          .snapshots(),
      builder: (context, snapshot) {
        final hasUnread = snapshot.hasData && snapshot.data!.docs.isNotEmpty;

        // Modern Flutter way to do notification dots
        return Badge(
          isLabelVisible: hasUnread,
          smallSize: 10,
          backgroundColor: Colors.red,
          alignment: const Alignment(
            0.4,
            -0.4,
          ), // Adjusts dot position over the icon
          child: IconButton(
            icon: const Icon(Icons.notifications_none, color: Colors.white),
            onPressed: onPressed,
          ),
        );
      },
    );
  }
}
