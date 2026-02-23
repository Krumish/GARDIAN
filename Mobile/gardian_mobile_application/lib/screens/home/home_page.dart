import 'package:flutter/material.dart';
import 'report/issue_type_selection_page.dart';
import '../../widgets/report_history.dart';
import '../../widgets/home_header.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,

      body: Column(
        children: const [
          HomeHeader(),
          Expanded(child: ReportHistory()),
        ],
      ),

      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const IssueTypeSelectionPage()),
          );
        },
        backgroundColor: Colors.green,
        label: const Text(
          "Report an Issue",
          style: TextStyle(fontSize: 20, color: Colors.white),
        ),
        extendedPadding: const EdgeInsets.symmetric(horizontal: 90.0),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }
}
