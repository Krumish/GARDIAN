import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

class YoloService {
  static Future<Map<String, dynamic>> detect(File file) async {
    try {
      // final uri = Uri.parse("https: //yolo-backend-xrko.onrender.com/");
      final uri = Uri.parse("http://10.0.2.2:8000/detect/");
      
      final request = http.MultipartRequest("POST", uri);
      request.files.add(await http.MultipartFile.fromPath("file", file.path));

      final response = await request.send();

      if (response.statusCode == 200) {
        final body = await response.stream.bytesToString();
        final decoded = jsonDecode(body) as Map<String, dynamic>;

        // 🔹 Decode annotated image (base64)
        if (decoded.containsKey("annotated_image")) {
          final bytes = base64Decode(decoded["annotated_image"]);
          final dir = await getTemporaryDirectory();
          final annotatedFile = File(
            "${dir.path}/annotated_${DateTime.now().millisecondsSinceEpoch}.jpg",
          );
          await annotatedFile.writeAsBytes(bytes);

          // Attach the annotated file to the result map
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
