import 'package:cloud_firestore/cloud_firestore.dart';

class FirestoreService {
  final _db = FirebaseFirestore.instance;

  Future<void> createUserProfile({
    required String uid,
    required String email,
    required String phone,
    required String fullName,
    required String barangay,
    String role = "user",
  }) async {
    await _db.collection("users").doc(uid).set({
      "email": email,
      "phone": phone,
      "fullName": fullName,
      "barangay": barangay,
      "role": role,
      "createdAt": FieldValue.serverTimestamp(),
    });
  }
}
