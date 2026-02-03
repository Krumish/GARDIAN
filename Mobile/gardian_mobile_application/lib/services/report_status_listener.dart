import 'package:cloud_firestore/cloud_firestore.dart';
import 'auth_services.dart';

class ReportStatusListener {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  final Map<String, String> _lastStatusMap = {};

  void start() {
    final uid = authService.value.currentUser?.uid;
    if (uid == null) return;

    _firestore
        .collection('users')
        .doc(uid)
        .collection('uploads')
        .snapshots()
        .listen((snapshot) {
          for (final doc in snapshot.docs) {
            final data = doc.data();
            final reportId = doc.id;
            final newStatus = data['status'] as String?;
            final issueType = data['issueType'] ?? 'Report';

            if (newStatus == null) continue;

            final oldStatus = _lastStatusMap[reportId];

            if (oldStatus != null && oldStatus != newStatus) {
              _createNotification(
                reportId: reportId,
                newStatus: newStatus,
                issueType: issueType,
              );
            }

            _lastStatusMap[reportId] = newStatus;
          }
        });
  }

  Future<void> _createNotification({
    required String reportId,
    required String newStatus,
    required String issueType,
  }) async {
    final uid = authService.value.currentUser?.uid;
    if (uid == null) return;

    await _firestore
        .collection('users')
        .doc(uid)
        .collection('notifications')
        .add({
          'title': 'Report Status Updated',
          'message': 'Your $issueType report is now marked as $newStatus',
          'reportId': reportId,
          'newStatus': newStatus,
          'issueType': issueType,
          'createdAt': FieldValue.serverTimestamp(),
          'read': false,
        });
  }
}

final reportStatusListener = ReportStatusListener();
