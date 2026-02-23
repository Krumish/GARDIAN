import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart'; // 🔹 ADDED THIS
import 'photo_capture_page.dart';

class PhotoSelectionPage extends StatefulWidget {
  final String issueType;
  const PhotoSelectionPage({super.key, required this.issueType});

  @override
  State<PhotoSelectionPage> createState() => _PhotoSelectionPageState();
}

class _PhotoSelectionPageState extends State<PhotoSelectionPage> {
  final ImagePicker _picker = ImagePicker();

  // 🔹 NEW HELPER: Moves the temporary file to a permanent safe zone
  Future<File> _saveToDocuments(XFile xfile) async {
    final directory = await getApplicationDocumentsDirectory();
    final fileName = 'original_${DateTime.now().millisecondsSinceEpoch}.jpg';
    final savedImage = await File(
      xfile.path,
    ).copy('${directory.path}/$fileName');
    return savedImage;
  }

  Future<void> _pickFromGallery() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      final permanentFile = await _saveToDocuments(image);

      if (!mounted) return; // Standard flutter safety check

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PhotoCapturePage(
            imageFile: permanentFile, // Pass the permanent file
            issueType: widget.issueType,
          ),
        ),
      );
    }
  }

  Future<void> _takePhoto() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.camera);
    if (image != null) {
      // 🔹 FIX: Save to documents before navigating
      final permanentFile = await _saveToDocuments(image);

      if (!mounted) return; // Standard flutter safety check

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PhotoCapturePage(
            imageFile: permanentFile, // Pass the permanent file
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
