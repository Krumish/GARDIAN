import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import '../../services/storage_service.dart';
import '../../widgets/detection_review_dialog.dart';

class UploadWithLocationPage extends StatefulWidget {
  const UploadWithLocationPage({super.key});

  @override
  State<UploadWithLocationPage> createState() => _UploadWithLocationPageState();
}

class _UploadWithLocationPageState extends State<UploadWithLocationPage> {
  LatLng? selectedLocation;
  File? _selectedImage;
  bool _isProcessing = false;

  Future<Map<String, dynamic>?> _sendToYoloServer(File file) async {
    // for real phone:
    // final uri = Uri.parse("http://192.168.254.106:8000/detect/");
    final uri = Uri.parse("http://10.0.2.2:8000/detect/");
    final request = http.MultipartRequest("POST", uri);
    request.files.add(await http.MultipartFile.fromPath("file", file.path));

    final response = await request.send();
    if (response.statusCode == 200) {
      final body = await response.stream.bytesToString();
      final decoded = jsonDecode(body);
      debugPrint("✅ YOLO response: $decoded");
      return decoded;
    } else {
      throw Exception("YOLO server error: ${response.statusCode}");
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);

    if (pickedFile == null) return;
    setState(() => _selectedImage = File(pickedFile.path));

    try {
      setState(() => _isProcessing = true);

      // 🔹 YOLO detection
      final yoloResults = await _sendToYoloServer(_selectedImage!);
      if (!mounted) return;

      // 🔹 Show review dialog before uploading
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => DetectionReviewDialog(
          originalFile: _selectedImage!,
          yolo: yoloResults ?? {},
          onConfirm: () async {
            try {
              await storageService.uploadUserImage(
                _selectedImage!,
                yoloResults: yoloResults,
                lat: selectedLocation?.latitude,
                lng: selectedLocation?.longitude,
              );

              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text("✅ Image uploaded successfully!"),
                  ),
                );
                Navigator.pop(context); // go back home
              }
            } catch (e) {
              if (mounted) {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(SnackBar(content: Text("Upload failed: $e")));
              }
            }
          },
        ),
      );
    } catch (e) {
      debugPrint("🔥 YOLO error: $e");
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text("Error: $e")));
      }
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Select Location & Upload")),
      body: Column(
        children: [
          Expanded(
            child: GoogleMap(
              initialCameraPosition: const CameraPosition(
                target: LatLng(14.5806, 121.1157),
                zoom: 15,
              ),
              onTap: (LatLng pos) {
                setState(() => selectedLocation = pos);
              },
              markers: selectedLocation != null
                  ? {
                      Marker(
                        markerId: const MarkerId("selected"),
                        position: selectedLocation!,
                      ),
                    }
                  : {},
            ),
          ),
          if (_selectedImage != null)
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Image.file(_selectedImage!, height: 100),
            ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: ElevatedButton.icon(
              onPressed: selectedLocation == null || _isProcessing
                  ? null
                  : _pickImage,
              icon: const Icon(Icons.image),
              label: Text(_isProcessing ? "Processing..." : "Select Image"),
            ),
          ),
        ],
      ),
    );
  }
}
