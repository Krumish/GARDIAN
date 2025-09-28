import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'auth_services.dart';

class StorageService {
  final _storage = FirebaseStorage.instance;
  final _firestore = FirebaseFirestore.instance;

  /// Upload image to Firebase Storage and save metadata in Firestore
  Future<void> uploadUserImage(File imageFile) async {
    final uid = authService.value.currentUser!.uid;
    final fileName = DateTime.now().millisecondsSinceEpoch.toString();
    final storageRef = _storage.ref().child('users/$uid/$fileName.jpg');

    // Upload image
    await storageRef.putFile(imageFile);
    final downloadUrl = await storageRef.getDownloadURL();

    // Save metadata to Firestore
    await _firestore.collection('users').doc(uid).collection('uploads').add({
      'url': downloadUrl,
      'uploadedAt': FieldValue.serverTimestamp(),
    });
  }

  /// Get user uploads stream (for history list)
  Stream<QuerySnapshot> getUserUploadsStream(String uid) {
    return _firestore
        .collection('users')
        .doc(uid)
        .collection('uploads')
        .orderBy('uploadedAt', descending: true)
        .snapshots();
  }
}

final storageService = StorageService();
