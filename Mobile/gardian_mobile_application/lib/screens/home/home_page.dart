import 'package:flutter/material.dart';
import '../../services/auth_services.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});
  @override
  Widget build(BuildContext context) {
    final user = authService.value.currentUser;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            onPressed: () async {
              await authService.value.signOut();
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Center(child: Text('Welcome, ${user?.email ?? 'User'}')),
    );
  }
}
