import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../services/auth_services.dart';
import '../../services/storage_service.dart';
import 'profile_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  File? _selectedImage;
  bool _isUploading = false;

  Future<void> _pickAndUploadImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);

    if (pickedFile == null) return;

    setState(() {
      _selectedImage = File(pickedFile.path);
      _isUploading = true;
    });

    try {
      await storageService.uploadUserImage(_selectedImage!);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Image uploaded successfully!")),
        );
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
    final uid = authService.value.currentUser?.uid;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProfilePage()),
              );
            },
            icon: const Icon(Icons.person),
          ),
          IconButton(
            onPressed: () async {
              await authService.value.signOut();
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Column(
        children: [
          const SizedBox(height: 20),

          ElevatedButton.icon(
            onPressed: _isUploading ? null : _pickAndUploadImage,
            icon: const Icon(Icons.camera_alt),
            label: Text(_isUploading ? "Uploading..." : "Add Photo"),
          ),

          const SizedBox(height: 20),

          if (_selectedImage != null) Image.file(_selectedImage!, height: 150),

          const Divider(),

          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: storageService.getUserUploadsStream(uid!),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                  return const Center(child: Text("No uploads yet"));
                }

                final uploads = snapshot.data!.docs;

                return ListView.builder(
                  itemCount: uploads.length,
                  itemBuilder: (context, index) {
                    final data = uploads[index].data() as Map<String, dynamic>;
                    final url = data['url'] as String?;
                    final timestamp = (data['uploadedAt'] as Timestamp?)
                        ?.toDate();

                    return ListTile(
                      leading: url != null
                          ? Image.network(
                              url,
                              width: 50,
                              height: 50,
                              fit: BoxFit.cover,
                            )
                          : const Icon(Icons.image),
                      title: Text("Uploaded at: ${timestamp ?? 'Unknown'}"),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
