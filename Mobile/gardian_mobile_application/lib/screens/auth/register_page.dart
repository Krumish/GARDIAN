import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:gardian_mobile_application/screens/auth/login_page.dart';
import '../../services/auth_services.dart';
import 'otp_page.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/custom_button.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController =
      TextEditingController(); // 📍 NEW: Controller added

  // Dropdown state
  String? _selectedBarangay;
  bool _isLoading = false;

  // List of Cainta Barangays
  final List<String> _caintaBarangays = [
    "San Andres (Poblacion)",
    "San Roque",
    "San Juan",
    "Santo Domingo",
    "Santo Niño",
    "San Isidro",
    "Santa Rosa",
  ];

  String _getFriendlyErrorMessage(dynamic error) {
    if (error is FirebaseAuthException) {
      switch (error.code) {
        case 'email-already-in-use':
          return "This email is already registered. Please log in.";
        case 'invalid-email':
          return "Please enter a valid email address.";
        case 'weak-password':
          return "Your password is too weak. Please use a stronger password.";
        case 'invalid-phone-number':
          return "Please enter a valid phone number (e.g., +639...).";
        case 'network-request-failed':
          return "Network error. Please check your internet connection.";
        case 'too-many-requests':
          return "Too many attempts. Please try again later.";
        default:
          return "Registration failed. Please try again.";
      }
    }
    return "Something went wrong. Please check your connection and try again.";
  }

  void _sendOtp() async {
    if (_firstNameController.text.trim().isEmpty ||
        _lastNameController.text.trim().isEmpty ||
        _emailController.text.trim().isEmpty ||
        _phoneController.text.trim().isEmpty ||
        _passwordController.text.trim().isEmpty ||
        _confirmPasswordController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Please fill in all fields"),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (_passwordController.text != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Passwords do not match"),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (_selectedBarangay == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Please select a Barangay"),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    await authService.value.sendOtp(
      phoneNumber: _phoneController.text.trim(),
      codeSent: (verificationId) {
        if (mounted) setState(() => _isLoading = false);

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => OtpPage(
              verificationId: verificationId,
              email: _emailController.text.trim(),
              password: _passwordController.text
                  .trim(), // Note: OTP page handles actual registration, so we only need to pass the real password
              firstName: _firstNameController.text.trim(),
              lastName: _lastNameController.text.trim(),
              barangay: _selectedBarangay!,
              phone: _phoneController.text.trim(),
            ),
          ),
        );
      },
      onError: (error) {
        if (mounted) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(_getFriendlyErrorMessage(error)),
              backgroundColor: Colors.redAccent,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              flex: 2,
              child: Center(
                child: Image.asset("assets/icons/GARDIAN.png", height: 180),
              ),
            ),

            // Form Section
            Expanded(
              flex: 5,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: const BoxDecoration(
                  color: Color(0xFF162447),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(40),
                    topRight: Radius.circular(40),
                  ),
                ),
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Sign up",
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 5),
                      const Text(
                        "Create an account to get started",
                        style: TextStyle(color: Colors.white70),
                      ),
                      const SizedBox(height: 20),

                      CustomTextField(
                        controller: _firstNameController,
                        hintText: "First name",
                      ),
                      const SizedBox(height: 12),
                      CustomTextField(
                        controller: _lastNameController,
                        hintText: "Last name",
                      ),
                      const SizedBox(height: 12),
                      CustomTextField(
                        controller: _emailController,
                        hintText: "Email",
                      ),
                      const SizedBox(height: 12),

                      // Barangay Dropdown
                      DropdownButtonFormField<String>(
                        value: _selectedBarangay,
                        hint: const Text(
                          "Select Barangay",
                          style: TextStyle(color: Colors.black87, fontSize: 16),
                        ),
                        dropdownColor: Colors.white,
                        icon: const Icon(
                          Icons.arrow_drop_down,
                          color: Colors.grey,
                        ),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: Colors.grey[100],
                          contentPadding: const EdgeInsets.symmetric(
                            vertical: 18,
                            horizontal: 16,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide.none,
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide.none,
                          ),
                        ),
                        style: const TextStyle(
                          fontSize: 16,
                          color: Colors.black87,
                          fontFamily: 'Roboto',
                        ),
                        items: _caintaBarangays.map((String barangay) {
                          return DropdownMenuItem<String>(
                            value: barangay,
                            child: Text(barangay),
                          );
                        }).toList(),
                        onChanged: (String? newValue) {
                          setState(() {
                            _selectedBarangay = newValue;
                          });
                        },
                      ),

                      const SizedBox(height: 12),
                      CustomTextField(
                        controller: _phoneController,
                        hintText: "Phone",
                        keyboardType: TextInputType.phone,
                      ),
                      const SizedBox(height: 12),
                      CustomTextField(
                        controller: _passwordController,
                        hintText: "Create password",
                        obscureText: true,
                      ),
                      const SizedBox(height: 12),

                      CustomTextField(
                        controller: _confirmPasswordController,
                        hintText: "Confirm password",
                        obscureText: true,
                      ),

                      const SizedBox(height: 20),

                      CustomButton(
                        text: "Register",
                        isLoading: _isLoading,
                        onPressed: _sendOtp,
                      ),

                      const SizedBox(height: 12),
                      Center(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text(
                              "Already a member?",
                              style: TextStyle(color: Colors.white70),
                            ),
                            TextButton(
                              onPressed: () {
                                Navigator.pushReplacement(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const LoginPage(),
                                  ),
                                );
                              },
                              child: const Text(
                                "Login now",
                                style: TextStyle(color: Colors.lightBlueAccent),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
