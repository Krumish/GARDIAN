import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'auth_services.dart';

class StorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<void> uploadUserImage(
    File file, {
    File? annotatedImageFile, // 🔹 Updated from Uint8List to File
    Map<String, dynamic>? yoloResults,
    double? lat,
    double? lng,
    String? address,
    String? note,
    String? issueType,
  }) async {
    final uid = authService.value.currentUser?.uid;
    if (uid == null) throw Exception("Not logged in");

    final uploadId = const Uuid().v4();

    // 1. Upload Original Image
    final ref = _storage.ref().child("user_uploads/$uid/$uploadId.jpg");
    await ref.putFile(file);
    final url = await ref.getDownloadURL();

    String? annotatedUrl;

    // 2. Upload Annotated Image ONLY if present
    if (annotatedImageFile != null && await annotatedImageFile.exists()) {
      try {
        final annotatedRef = _storage.ref().child(
          "user_uploads/$uid/${uploadId}_annotated.jpg",
        );

        // 🔹 Use putFile (Streaming upload from disk)
        await annotatedRef.putFile(
          annotatedImageFile,
          SettableMetadata(contentType: "image/jpeg"),
        );

        annotatedUrl = await annotatedRef.getDownloadURL();
      } catch (e) {
        debugPrint("Upload error: $e");
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

          // 🔢 Promoted Metrics
          "blockagePercent": cleanYolo["blockage_percent"],
          "blockageRatio": cleanYolo["max_blockage_ratio"],
          "drainageCount": cleanYolo["drainage_count"],
          "obstructionCount": cleanYolo["obstruction_count"],
          "yoloStatus": cleanYolo["status"],

          // 📍 Metadata
          "latitude": lat,
          "longitude": lng,
          "address": address,
          "note": note,
          "issueType": issueType ?? "Unknown",

          "status": "Pending",
        });
  }

  Map<String, dynamic> _sanitizeYoloResults(Map<String, dynamic>? results) {
    if (results == null) return {};

    final sanitized = Map<String, dynamic>.from(results);

    // 🔹 REMOVE non-storable objects (Files and Base64 strings)
    sanitized.remove("annotated_image");
    sanitized.remove("annotatedFile");

    sanitized.updateAll((key, value) {
      if (value is int ||
          value is double ||
          value is String ||
          value is bool ||
          value == null)
        return value;
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
