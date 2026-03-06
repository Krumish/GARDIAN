import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'services/auth_services.dart';
import 'main_wrapper.dart';
import 'screens/auth/login_page.dart';
import 'onboarding_page.dart';

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      // Note: Assuming 'authStateChages' is spelled exactly like this in your auth_services.dart!
      stream: authService.value.authStateChages,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            //  Themed the loading spinner
            body: Center(
              child: CircularProgressIndicator(color: Color(0xFF162447)),
            ),
          );
        }

        // Not logged in
        if (!snapshot.hasData) {
          return const LoginPage();
        }

        final user = snapshot.data!;

        return FutureBuilder<DocumentSnapshot>(
          future: FirebaseFirestore.instance
              .collection("users")
              .doc(user.uid)
              .get(),
          builder: (context, userSnapshot) {
            if (userSnapshot.connectionState == ConnectionState.waiting) {
              return const Scaffold(
                //  Themed the loading spinner
                body: Center(
                  child: CircularProgressIndicator(color: Color(0xFF162447)),
                ),
              );
            }

            final data = userSnapshot.data?.data() as Map<String, dynamic>?;
            final seenOnboarding = data?["seen_onboarding"] == true;

            if (seenOnboarding) {
              return const MainWrapper();
            } else {
              return const OnboardingPage();
            }
          },
        );
      },
    );
  }
}
