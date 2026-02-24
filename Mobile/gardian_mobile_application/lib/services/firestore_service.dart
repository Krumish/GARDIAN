import 'package:cloud_firestore/cloud_firestore.dart';

class FirestoreService {
  final _db = FirebaseFirestore.instance;

  // 🔹 Update to include split names
  Future<void> createUserProfile({
    required String uid,
    required String email,
    required String phone,
    required String firstName,
    required String lastName,
    required String barangay,
    String role = "user",
  }) async {
    await _db.collection("users").doc(uid).set({
      "email": email,
      "phone": phone,
      "firstName": firstName,
      "lastName": lastName,
      "barangay": barangay,
      "role": role,
      "createdAt": FieldValue.serverTimestamp(),
    });
  }

  Future<DocumentSnapshot> getUserData(String uid) async {
    return await _db.collection("users").doc(uid).get();
  }

  // 🔹 Update specific fields (Split names)
  Future<void> updateUserProfile({
    required String uid,
    required String firstName,
    required String lastName,
    required String phone,
    required String barangay,
  }) async {
    await _db.collection("users").doc(uid).update({
      "firstName": firstName,
      "lastName": lastName,
      "phone": phone,
      "barangay": barangay,
    });
  }
}

final firestoreService = FirestoreService();
