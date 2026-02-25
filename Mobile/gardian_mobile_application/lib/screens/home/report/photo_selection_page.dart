import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'photo_capture_page.dart';

class PhotoSelectionPage extends StatefulWidget {
  final String issueType;
  final bool requiresAI; // 🔹 Added flag to receive from IssueTypeSelectionPage

  const PhotoSelectionPage({
    super.key,
    required this.issueType,
    required this.requiresAI, // 🔹 Make it required
  });

  @override
  State<PhotoSelectionPage> createState() => _PhotoSelectionPageState();
}

class _PhotoSelectionPageState extends State<PhotoSelectionPage> {
  final ImagePicker _picker = ImagePicker();
  final Color _navyColor = const Color(
    0xFF162447,
  ); // 🔹 Updated to new global theme

  Future<File> _saveToDocuments(XFile xfile) async {
    final directory = await getApplicationDocumentsDirectory();
    final fileName = 'original_${DateTime.now().millisecondsSinceEpoch}.jpg';
    final savedImage = await File(
      xfile.path,
    ).copy('${directory.path}/$fileName');
    return savedImage;
  }

  Future<void> _handleImageSelection(ImageSource source) async {
    final XFile? image = await _picker.pickImage(
      source: source,
      imageQuality: 80, // Optimized for upload speed
    );

    if (image != null) {
      final permanentFile = await _saveToDocuments(image);
      if (!mounted) return;

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PhotoCapturePage(
            imageFile: permanentFile,
            issueType: widget.issueType,
            requiresAI:
                widget.requiresAI, // 🔹 Pass the flag forward to the next page!
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50, // 🔹 Softer background to match app
      appBar: AppBar(
        title: Text(
          "Report ${widget.issueType}",
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        backgroundColor: _navyColor,
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 32),
            Text(
              "Evidence is Key",
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.bold,
                color: _navyColor,
              ),
            ),
            const SizedBox(height: 12),

            // 🔹 Dynamic Text: Tells the user if AI is analyzing this or not
            Text(
              "Please provide a clear photo of the ${widget.issueType.toLowerCase()} to help us assess the situation. ${widget.requiresAI ? 'GARDIAN AI will analyze this image instantly.' : 'This report will be sent directly to MENRO for manual review.'}",
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 16,
                height: 1.4,
              ),
            ),
            const Spacer(),

            // 🔹 Action Card: Take Photo
            _buildSelectionCard(
              title: "Take a New Photo",
              subtitle: "Use your camera to capture the issue now",
              icon: Icons.camera_alt_rounded,
              color: Colors.green,
              onTap: () => _handleImageSelection(ImageSource.camera),
            ),

            const SizedBox(height: 20),

            // 🔹 Action Card: Gallery
            _buildSelectionCard(
              title: "Upload from Gallery",
              subtitle: "Choose an existing photo from your device",
              icon: Icons.photo_library_rounded,
              color: _navyColor,
              onTap: () => _handleImageSelection(ImageSource.gallery),
            ),

            const Spacer(flex: 2),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.1),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.grey.shade200, width: 1.5),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(15),
                  ),
                  child: Icon(icon, color: color, size: 32),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: _navyColor,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios_rounded,
                  color: Colors.grey.shade300,
                  size: 18,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
