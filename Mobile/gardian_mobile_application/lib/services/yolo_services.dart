import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'config_service.dart';

class YoloService {
  static Future<Map<String, dynamic>> detect(
    File file,
    String issueType,
  ) async {
    try {
      double confThreshold = 0.25;

      try {
        final configDoc = await FirebaseFirestore.instance
            .collection('app_settings')
            .doc('ai_config')
            .get();

        if (configDoc.exists && configDoc.data() != null) {
          final data = configDoc.data()!;
          confThreshold = (data['confidence_threshold'] ?? 0.25).toDouble();
        }
      } catch (firebaseError) {
        print(
          "Warning: Failed to fetch conf from Firebase, using default 0.25. Error: $firebaseError",
        );
      }
      // ----------------------------------------------------

      // For production
      // final url = await ConfigService.getYoloUrl();
      // final uri = Uri.parse(url);

      // For local testing on Android Emulator
      final uri = Uri.parse("http://10.0.2.2:8000/detect/");

      final request = http.MultipartRequest("POST", uri);

      request.fields['issue_type'] = issueType;

      request.fields['conf'] = confThreshold.toString();

      request.files.add(await http.MultipartFile.fromPath("file", file.path));

      final response = await request.send();

      if (response.statusCode == 200) {
        final body = await response.stream.bytesToString();
        final decoded = jsonDecode(body) as Map<String, dynamic>;

        if (decoded.containsKey("annotated_image")) {
          // 1. Decode Base64 to bytes
          final bytes = base64Decode(decoded["annotated_image"]);

          // 2. Get the directory on the phone
          final dir = await getApplicationDocumentsDirectory();

          // 3. Create a physical file path
          final annotatedFile = File(
            "${dir.path}/annotated_${DateTime.now().millisecondsSinceEpoch}.jpg",
          );

          // 4. Save the bytes to the file
          await annotatedFile.writeAsBytes(bytes, flush: true);

          // 5. Store the file object in the map
          decoded["annotatedFile"] = annotatedFile;
        }
        return decoded;
      } else {
        throw Exception("YOLO server error: ${response.statusCode}");
      }
    } catch (e) {
      throw Exception("Failed to connect to YOLO server: $e");
    }
  }
}
