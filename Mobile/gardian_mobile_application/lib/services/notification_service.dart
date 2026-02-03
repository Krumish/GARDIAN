import 'package:cloud_firestore/cloud_firestore.dart';
import 'auth_services.dart';

class NotificationService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<QuerySnapshot> getNotificationsStream() {
    final uid = authService.value.currentUser?.uid;
    if (uid == null) {
      return const Stream.empty();
    }

    return _firestore
        .collection("users")
        .doc(uid)
        .collection("notifications")
        .orderBy("createdAt", descending: true)
        .snapshots();
  }

  Future<void> markAsRead(String notificationId) async {
    final uid = authService.value.currentUser?.uid;
    if (uid == null) return;

    await _firestore
        .collection("users")
        .doc(uid)
        .collection("notifications")
        .doc(notificationId)
        .update({"read": true});
  }
}

final notificationService = NotificationService();
