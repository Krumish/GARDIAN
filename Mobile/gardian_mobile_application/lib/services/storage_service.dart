import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:uuid/uuid.dart';
import 'auth_services.dart';

class StorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<void> uploadUserImage(
    File file, {
    Map<String, dynamic>? yoloResults,
  }) async {
    final uid = authService.value.currentUser?.uid;
    if (uid == null) throw Exception("Not logged in");

    // Generate unique ID for this upload
    final uploadId = const Uuid().v4();

    // Path in Firebase Storage
    final ref = _storage.ref().child("user_uploads/$uid/$uploadId.jpg");

    // Upload file
    await ref.putFile(file);

    // Get download URL
    final url = await ref.getDownloadURL();

    // Save metadata + YOLO results in Firestore
    await _firestore
        .collection("users")
        .doc(uid)
        .collection("uploads")
        .doc(uploadId)
        .set({
          "url": url,
          "uploadedAt": FieldValue.serverTimestamp(),
          "yolo": yoloResults ?? {},
        });
  }

  Stream<QuerySnapshot> getUserUploadsStream(String uid) {
    return _firestore
        .collection("users")
        .doc(uid)
        .collection("uploads")
        .orderBy("uploadedAt", descending: true)
        .snapshots();
  }
}

final storageService = StorageService();
