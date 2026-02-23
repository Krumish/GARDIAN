import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'auth_services.dart';
import 'package:path_provider/path_provider.dart';

class StorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<void> uploadUserImage(
    File file, {
    File? annotatedImageFile,
    Map<String, dynamic>? yoloResults,
    double? lat,
    double? lng,
    String? address,
    String? note,
    String? issueType,
  }) async {
    final uid = authService.value.currentUser?.uid;
    if (uid == null) throw Exception("Not logged in");

    // Ensure the primary file exists before starting
    if (!await file.exists()) {
      throw Exception(
        "Original image file not found on disk. Please try again.",
      );
    }

    final uploadId = const Uuid().v4();

    // 1. Upload Original Image
    final ref = _storage.ref().child("user_uploads/$uid/$uploadId.jpg");

    // We use putFile for streaming upload (memory efficient)
    await ref.putFile(file, SettableMetadata(contentType: "image/jpeg"));
    final url = await ref.getDownloadURL();

    String? annotatedUrl;

    // 2. Upload Annotated Image ONLY if present and physically exists
    if (annotatedImageFile != null) {
      //  Verify annotated file on disk to prevent race conditions
      if (await annotatedImageFile.exists()) {
        try {
          final annotatedRef = _storage.ref().child(
            "user_uploads/$uid/${uploadId}_annotated.jpg",
          );

          await annotatedRef.putFile(
            annotatedImageFile,
            SettableMetadata(contentType: "image/jpeg"),
          );

          annotatedUrl = await annotatedRef.getDownloadURL();
        } catch (e) {
          debugPrint("Annotated image upload failed: $e");
          // We don't throw here so the user's report still goes through
          // even if the AI-annotated version fails.
        }
      } else {
        debugPrint(
          "Warning: annotatedImageFile path exists but file not found on disk.",
        );
      }
    }

    // 3. Clean up the YOLO results before saving to Firestore
    final cleanYolo = _sanitizeYoloResults(yoloResults);

    // 4. Save to Firestore
    await _firestore
        .collection("users")
        .doc(uid)
        .collection("uploads")
        .doc(uploadId)
        .set({
          "url": url,
          "annotatedUrl": annotatedUrl,
          "uploadedAt": FieldValue.serverTimestamp(),

          // 🔍 Full YOLO payload
          "yolo": cleanYolo,

          // 🔢 Promoted Metrics (Safe-checks for missing keys)
          "blockagePercent": cleanYolo["blockage_percent"] ?? 0,
          "blockageRatio": cleanYolo["max_blockage_ratio"] ?? 0,
          "drainageCount": cleanYolo["drainage_count"] ?? 0,
          "obstructionCount": cleanYolo["obstruction_count"] ?? 0,
          "yoloStatus": cleanYolo["status"] ?? "No detections",

          // 📍 Metadata
          "latitude": lat,
          "longitude": lng,
          "address": address,
          "note": note,
          "issueType": issueType ?? "Unknown",

          "status": "Pending",
        });
  }

  /// Removes large memory objects (Files/Base64) that Firestore cannot store.
  Map<String, dynamic> _sanitizeYoloResults(Map<String, dynamic>? results) {
    if (results == null) return {};

    final sanitized = Map<String, dynamic>.from(results);

    // REMOVE non-storable objects
    sanitized.remove("annotated_image"); // The large Base64 string
    sanitized.remove("annotatedFile"); // The File object

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
      return value.toString();
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
}

final storageService = StorageService();
