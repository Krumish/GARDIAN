import 'package:flutter/material.dart';
import 'report/issue_type_selection_page.dart';
import '../../widgets/custom_drawer.dart';
import '../../widgets/report_history.dart';
import '../../widgets/home_header.dart';
import '../../widgets/notification_modal.dart';
import '../../widgets/notification_icon.dart';

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
          NotificationIconButton(
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
