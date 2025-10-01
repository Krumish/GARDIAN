import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import '../../services/auth_services.dart';
import '../../services/storage_service.dart';

class UploadWithLocationPage extends StatefulWidget {
  const UploadWithLocationPage({super.key});

  @override
  State<UploadWithLocationPage> createState() => _UploadWithLocationPageState();
}

class _UploadWithLocationPageState extends State<UploadWithLocationPage> {
  LatLng? selectedLocation;
  File? _selectedImage;
  bool _isUploading = false;

  Future<Map<String, dynamic>?> _sendToYoloServer(File file) async {
    final uri = Uri.parse("http://10.0.2.2:8000/detect/");
    final request = http.MultipartRequest("POST", uri);
    request.files.add(await http.MultipartFile.fromPath("file", file.path));

    final response = await request.send();
    if (response.statusCode == 200) {
      final body = await response.stream.bytesToString();
      return jsonDecode(body);
    } else {
      throw Exception("YOLO server error: ${response.statusCode}");
    }
  }

  Future<void> _pickImageAndUpload() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);

    if (pickedFile == null) return;

    setState(() {
      _selectedImage = File(pickedFile.path);
      _isUploading = true;
    });

    try {
      // Step 1: YOLO detection
      final yoloResults = await _sendToYoloServer(_selectedImage!);

      // Step 2: Upload to Firebase
      await storageService.uploadUserImage(
        _selectedImage!,
        yoloResults: yoloResults,
        lat: selectedLocation?.latitude,
        lng: selectedLocation?.longitude,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Image uploaded successfully!")),
        );
        Navigator.pop(context); // back to home
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text("Upload failed: $e")));
      }
    } finally {
      setState(() => _isUploading = false);
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
                target: LatLng(14.5995, 120.9842), // Manila default
                zoom: 14,
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
              child: Image.file(_selectedImage!, height: 150),
            ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: ElevatedButton.icon(
              onPressed: selectedLocation == null || _isUploading
                  ? null
                  : _pickImageAndUpload,
              icon: const Icon(Icons.upload),
              label: Text(
                _isUploading ? "Uploading..." : "Select Image & Upload",
              ),
            ),
          ),
        ],
      ),
    );
  }
}
