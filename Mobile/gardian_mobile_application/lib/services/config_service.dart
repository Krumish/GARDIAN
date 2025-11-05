import 'package:cloud_firestore/cloud_firestore.dart';

class ConfigService {
  static Future<String> getYoloUrl() async {
    try {
      final doc = await FirebaseFirestore.instance
          .collection('config')
          .doc('server')
          .get();

      if (doc.exists && doc.data()?['yolo_url'] != null) {
        return doc['yolo_url'];
      } else {
        // fallback URL
        return "https://yolo-backend-xrko.onrender.com/detect/";
      }
    } catch (e) {
      print("⚠️ Failed to fetch YOLO URL from Firestore: $e");
      return "https://yolo-backend-xrko.onrender.com/detect/"; // fallback
    }
  }
}
