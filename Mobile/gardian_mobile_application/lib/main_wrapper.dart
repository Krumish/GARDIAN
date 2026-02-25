import 'package:flutter/material.dart';
import 'screens/home/home_page.dart';
import 'screens/feedback_page.dart';
import 'screens/contact_page.dart';
import 'screens/home/about_page.dart';
import 'screens/profile_page.dart';
import '../widgets/custom_drawer.dart';
import '../widgets/notification_icon.dart';
import '../widgets/notification_modal.dart';

class MainWrapper extends StatefulWidget {
  const MainWrapper({super.key});

  @override
  State<MainWrapper> createState() => _MainWrapperState();
}

class _MainWrapperState extends State<MainWrapper> {
  int _selectedIndex = 0;

  // actual pages
  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      const HomePage(),
      const FeedbackPage(),
      const ContactPage(),
      const AboutPage(),
      const ProfilePage(),
    ];
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF162447),
        elevation: 0,
        centerTitle: true,
        title: Image.asset(
          'assets/icons/GARDIAN_TEXT.png',
          height: 150,
          color: Colors.white,
        ),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          NotificationIconButton(
            onPressed: () => showNotificationModal(context),
          ),
        ],
      ),
      drawer: CustomDrawer(
        selectedIndex: _selectedIndex,
        onItemTapped: _onItemTapped,
      ),
      body: _pages[_selectedIndex],
    );
  }
}
