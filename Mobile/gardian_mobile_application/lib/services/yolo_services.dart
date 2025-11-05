import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'config_service.dart'; // ✅ import your new config service

class YoloService {
  static Future<Map<String, dynamic>> detect(File file) async {
    try {
      final url = await ConfigService.getYoloUrl(); // ✅ Fetch from Firestore
      final uri = Uri.parse(url);

      final request = http.MultipartRequest("POST", uri);
      request.files.add(await http.MultipartFile.fromPath("file", file.path));

      final response = await request.send();

      if (response.statusCode == 200) {
        final body = await response.stream.bytesToString();
        final decoded = jsonDecode(body) as Map<String, dynamic>;

        if (decoded.containsKey("annotated_image")) {
          final bytes = base64Decode(decoded["annotated_image"]);
          final dir = await getTemporaryDirectory();
          final annotatedFile = File(
            "${dir.path}/annotated_${DateTime.now().millisecondsSinceEpoch}.jpg",
          );
          await annotatedFile.writeAsBytes(bytes);
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
