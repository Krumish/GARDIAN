import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'config_service.dart';

class YoloService {
  /// Updated detect method to accept [issueType] (e.g., 'Drainage' or 'Pothole')
  static Future<Map<String, dynamic>> detect(
    File file,
    String issueType,
  ) async {
    try {
      // For production

      final url = await ConfigService.getYoloUrl();
      final uri = Uri.parse(url);

      // For local testing on Android Emulator
      // final uri = Uri.parse("http://10.0.2.2:8000/detect/");

      final request = http.MultipartRequest("POST", uri);

      request.fields['issue_type'] = issueType;

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

          // 4. SAVE BYTES TO DISK
          await annotatedFile.writeAsBytes(bytes, flush: true);

          // 5. Store the FILE object in the map
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
