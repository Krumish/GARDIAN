import 'dart:io';
import 'dart:convert';
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
    double? lat,
    double? lng,
    String? address,
    String? note,
  }) async {
    final uid = authService.value.currentUser?.uid;
    print("🔥 Current UID: $uid");
    if (uid == null) throw Exception("Not logged in");

    // Generate unique ID for this upload
    final uploadId = const Uuid().v4();
    print("🆔 Upload ID: $uploadId");

    // Path in Firebase Storage
    final ref = _storage.ref().child("user_uploads/$uid/$uploadId.jpg");

    // Upload original image
    print("📤 Uploading to Storage...");
    await ref.putFile(file);
    print("✅ Storage upload complete");

    // Get download URL
    final url = await ref.getDownloadURL();
    print("🔗 Download URL: $url");

    // Upload annotated image if YOLO returned one
    String? annotatedUrl;
    if (yoloResults != null && yoloResults["annotated_image"] != null) {
      try {
        print("🖼 Uploading annotated image...");
        final annotatedBytes = base64Decode(yoloResults["annotated_image"]);
        final annotatedRef = _storage.ref().child(
          "user_uploads/$uid/${uploadId}_annotated.jpg",
        );
        await annotatedRef.putData(
          annotatedBytes,
          SettableMetadata(contentType: "image/jpeg"),
        );
        annotatedUrl = await annotatedRef.getDownloadURL();
        print("✅ Annotated image uploaded: $annotatedUrl");
      } catch (e) {
        print("⚠️ Failed to upload annotated image: $e");
      }
    }

    // Clean YOLO results before saving
    final cleanYolo = _sanitizeYoloResults(yoloResults);

    // Save metadata + YOLO results + location in Firestore
    print("📝 Writing metadata to Firestore...");
    await _firestore
        .collection("users")
        .doc(uid)
        .collection("uploads")
        .doc(uploadId)
        .set({
          "url": url,
          "annotatedUrl": annotatedUrl,
          "uploadedAt": FieldValue.serverTimestamp(),
          "yolo": cleanYolo,
          "latitude": lat,
          "longitude": lng,
          "address": address,
          "note": note?.trim(),
          "status": "Pending",
        });

    print("✅ Firestore document created!");
  }

  /// Sanitize YOLO results to make them Firestore-safe
  Map<String, dynamic> _sanitizeYoloResults(Map<String, dynamic>? results) {
    if (results == null) return {};

    final sanitized = Map<String, dynamic>.from(results);

    // Remove raw base64 annotated image
    sanitized.remove("annotated_image");

    // Ensure JSON-safe values only
    sanitized.updateAll((key, value) {
      if (value is int ||
          value is double ||
          value is String ||
          value is bool ||
          value == null) {
        return value;
      }
      if (value is List) return List.from(value);
      if (value is Map) return Map<String, dynamic>.from(value);
      return value.toString(); // fallback
    });

    return sanitized;
  }

  Stream<QuerySnapshot> getUserUploadsStream(String uid) {
    return _firestore
        .collection("users")
        .doc(uid)
        .collection("uploads")
        .orderBy("uploadedAt", descending: true)
        .snapshots();
  }

  Future<String> uploadTempImage(File imageFile) async {
    final ref = FirebaseStorage.instance.ref(
      'temp_uploads/${DateTime.now().millisecondsSinceEpoch}.jpg',
    );
    await ref.putFile(imageFile);
    return await ref.getDownloadURL();
  }
}

final storageService = StorageService();
