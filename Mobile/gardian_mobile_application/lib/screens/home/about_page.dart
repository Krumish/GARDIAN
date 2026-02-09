import 'package:flutter/material.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("About GARDIAN")),
      body: const Padding(
        padding: EdgeInsets.all(16),
        child: Text(
          "GARDIAN is a mobile-based reporting system designed to help assess "
          "urban drainage and road conditions using AI-assisted image analysis.\n\n"
          "This application is part of an academic research project.",
          style: TextStyle(fontSize: 14),
        ),
      ),
    );
  }
}
