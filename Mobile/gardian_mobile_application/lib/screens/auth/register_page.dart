import 'package:flutter/material.dart';
import 'package:gardian_mobile_application/screens/auth/login_page.dart';
import '../../services/auth_services.dart';
import 'otp_page.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/custom_button.dart'; // 🔹 Added this import

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

  // 🔹 Dropdown state
  String? _selectedBarangay;
  bool _isLoading = false;

  // 🔹 List of Cainta Barangays
  final List<String> _caintaBarangays = [
    "San Andres (Poblacion)",
    "San Roque",
    "San Juan",
    "Santo Domingo",
    "Santo Niño",
    "San Isidro",
    "Santa Rosa",
  ];

  void _sendOtp() async {
    // 🔹 Added validation for all fields
    if (_firstNameController.text.trim().isEmpty ||
        _lastNameController.text.trim().isEmpty ||
        _emailController.text.trim().isEmpty ||
        _phoneController.text.trim().isEmpty ||
        _passwordController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Please fill in all fields"),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    if (_selectedBarangay == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Please select a Barangay"),
          backgroundColor: Colors.redAccent,
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
              password: _passwordController.text.trim(),
              firstName: _firstNameController.text.trim(),
              lastName: _lastNameController.text.trim(),
              barangay: _selectedBarangay!, // Pass the selected value
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
              content: Text("Error: $error"),
              backgroundColor: Colors.redAccent,
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
            // 🔹 Logo Section (Matches Login Page structure)
            Expanded(
              flex: 2,
              child: Center(
                // Slightly smaller logo here to accommodate more form fields
                child: Image.asset("assets/icons/GARDIAN.png", height: 180),
              ),
            ),

            // 🔹 Form Section
            Expanded(
              flex: 5, // Gives more room for the longer registration form
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
                          fontSize: 22, // 🔹 Matched login header size
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

                      const SizedBox(height: 20),

                      // 🔹 Unified CustomButton usage
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
                                  // 🔹 Use replacement to prevent stacking too many pages
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
