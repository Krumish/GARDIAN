import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'photo_capture_page.dart';

class PhotoSelectionPage extends StatefulWidget {
  final String issueType;
  const PhotoSelectionPage({super.key, required this.issueType});

  @override
  State<PhotoSelectionPage> createState() => _PhotoSelectionPageState();
}

class _PhotoSelectionPageState extends State<PhotoSelectionPage> {
  final ImagePicker _picker = ImagePicker();

  Future<void> _pickFromGallery() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PhotoCapturePage(
            imageFile: File(image.path),
            issueType: widget.issueType,
          ),
        ),
      );
    }
  }

  Future<void> _takePhoto() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.camera);
    if (image != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PhotoCapturePage(
            imageFile: File(image.path),
            issueType: widget.issueType,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Report: ${widget.issueType}"),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Spacer(),
            Icon(
              Icons.cloud_upload_outlined,
              size: 100,
              color: Colors.blueGrey.shade300,
            ),
            const SizedBox(height: 24),
            Text(
              "How do you want to add a ${widget.issueType} photo?",
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 48),
            ElevatedButton.icon(
              onPressed: _pickFromGallery,
              icon: const Icon(Icons.photo_library_outlined),
              label: const Text("Upload from Gallery"),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _takePhoto,
              icon: const Icon(Icons.camera_alt_outlined),
              label: const Text("Take a New Photo"),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
            const Spacer(),
          ],
        ),
      ),
    );
  }
}
