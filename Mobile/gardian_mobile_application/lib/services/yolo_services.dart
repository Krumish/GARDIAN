import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class YoloService {
  static Future<dynamic> detect(File file) async {
    try {
      final uri = Uri.parse("http://10.0.2.2:8000/detect/");
      final request = http.MultipartRequest("POST", uri);
      request.files.add(await http.MultipartFile.fromPath("file", file.path));

      final response = await request.send();

      if (response.statusCode == 200) {
        final body = await response.stream.bytesToString();
        final decoded = jsonDecode(body);
        return decoded; // can be Map or List
      } else {
        throw Exception("YOLO server error: ${response.statusCode}");
      }
    } catch (e) {
      throw Exception("Failed to connect to YOLO server: $e");
    }
  }
}
