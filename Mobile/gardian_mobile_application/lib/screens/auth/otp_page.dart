import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:pinput/pinput.dart';
import '../../services/auth_services.dart';
import 'register_page.dart';

class OtpPage extends StatefulWidget {
  final String verificationId;
  final String email;
  final String password;
  final String firstName;
  final String lastName;
  final String barangay;
  final String phone;

  const OtpPage({
    super.key,
    required this.verificationId,
    required this.email,
    required this.password,
    required this.firstName,
    required this.lastName,
    required this.barangay,
    required this.phone,
  });

  @override
  State<OtpPage> createState() => _OtpPageState();
}

class _OtpPageState extends State<OtpPage> {
  final _otpController = TextEditingController();
  bool _isLoading = false;

  void _verifyOtp() async {
    setState(() => _isLoading = true);

    try {
      final userCred = await authService.value.verifyOtpAndRegister(
        verificationId: widget.verificationId,
        smsCode: _otpController.text.trim(),
        email: widget.email,
        password: widget.password,
      );

      await userCred.user!.updateDisplayName(widget.firstName);
      await userCred.user!.reload();

      await FirebaseFirestore.instance
          .collection("users")
          .doc(userCred.user!.uid)
          .set({
            "email": widget.email,
            "phone": widget.phone,
            "firstName": widget.firstName,
            "lastName": widget.lastName,
            "barangay": widget.barangay,
            "role": "user",
            "createdAt": FieldValue.serverTimestamp(),
          });

      if (!mounted) return;
      Navigator.pop(context); // back to login
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Account created successfully!")),
      );
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text("Invalid OTP: $e")));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final defaultPinTheme = PinTheme(
      width: 56,
      height: 56,
      textStyle: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade400),
        borderRadius: BorderRadius.circular(12),
      ),
    );

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 🔙 Back Button
              Align(
                alignment: Alignment.topLeft,
                child: IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.black87),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const RegisterPage()),
                    );
                  },
                ),
              ),

              const SizedBox(height: 120),

              // 📨 Icon / Illustration
              Center(child: Image.asset("assets/icons/otp.png", height: 120)),
              const SizedBox(height: 20),

              const Center(
                child: Text(
                  "Enter confirmation code",
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 5),
              const Center(
                child: Text(
                  "A 6-digit code was sent to your phone number",
                  style: TextStyle(color: Colors.black54),
                ),
              ),

              const SizedBox(height: 30),

              // 🔢 PIN INPUT
              Center(
                child: Pinput(
                  length: 6,
                  controller: _otpController,
                  defaultPinTheme: defaultPinTheme,
                  focusedPinTheme: defaultPinTheme.copyWith(
                    decoration: defaultPinTheme.decoration!.copyWith(
                      border: Border.all(color: Colors.green),
                    ),
                  ),
                  submittedPinTheme: defaultPinTheme.copyWith(
                    decoration: defaultPinTheme.decoration!.copyWith(
                      border: Border.all(color: Colors.green),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 20),

              Center(
                child: TextButton(
                  onPressed: () {
                    // TODO: Hook up resend logic
                  },
                  child: const Text("Resend code"),
                ),
              ),

              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _verifyOtp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                          "Continue",
                          style: TextStyle(color: Colors.white, fontSize: 16),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
