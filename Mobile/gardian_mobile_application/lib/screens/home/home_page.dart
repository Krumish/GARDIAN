import 'package:flutter/material.dart';
import '../../services/auth_services.dart';
import 'report/photo_selection_page.dart';
import '../../widgets/custom_drawer.dart';
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
            onPressed: () {},
            icon: const Icon(Icons.notifications_none, color: Colors.white),
          ),
        ],
      ),

      drawer: const CustomDrawer(),

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
            MaterialPageRoute(builder: (_) => const PhotoSelectionPage()),
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
