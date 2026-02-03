import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import '../../services/auth_services.dart';
import 'report/issue_type_selection_page.dart';
import '../../widgets/custom_drawer.dart';
import '../../widgets/report_history.dart';
import '../../widgets/home_header.dart';
import '../../widgets/notification_modal.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF122D5A),
        elevation: 0,
        centerTitle: true,
        title: Image.asset(
          'assets/icons/GARDIAN_TEXT.png',
          height: 180,
          color: Colors.white,
        ),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none, color: Colors.white),
            onPressed: () {
              showNotificationModal(context);
            },
          ),
        ],
      ),

      drawer: const CustomDrawer(),

      body: Column(
        children: [
          const HomeHeader(),
          ElevatedButton(
            onPressed: () async {
              final uid = authService.value.currentUser!.uid;

              await FirebaseFirestore.instance
                  .collection("users")
                  .doc(uid)
                  .collection("notifications")
                  .add({
                    "reportId": "TEST_UI",
                    "oldStatus": "Pending",
                    "newStatus": "Resolved",
                    "message": "Your report has been resolved",
                    "createdAt": FieldValue.serverTimestamp(),
                    "read": false,
                  });
            },
            child: const Text("TEST NOTIFICATION"),
          ),
          const Expanded(child: ReportHistory()),
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
        extendedPadding: EdgeInsets.symmetric(horizontal: 90.0),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }
}
