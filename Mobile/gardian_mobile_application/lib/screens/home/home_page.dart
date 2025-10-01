import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../services/auth_services.dart';
import '../../services/storage_service.dart';
import 'profile_page.dart';
import 'upload_with_location_page.dart'; // new page

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
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
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const UploadWithLocationPage(),
                ),
              );
            },
            icon: const Icon(Icons.add_location_alt),
            label: const Text("Upload with Location"),
          ),

          const Divider(),

          // History list of uploads
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
                    final yolo = data['yolo'] as Map<String, dynamic>?;
                    final lat = data['latitude'];
                    final lng = data['longitude'];

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
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (yolo != null)
                            Text(
                              "Status: ${yolo['status'] ?? 'N/A'} | "
                              "Persons: ${yolo['person_count'] ?? 0} | "
                              "Benches: ${yolo['bench_count'] ?? 0}",
                            ),
                          if (lat != null && lng != null)
                            Text("Location: ($lat, $lng)"),
                        ],
                      ),
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
