import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:pinput/pinput.dart';
import '../../services/auth_services.dart';
import '../../widgets/custom_button.dart'; // 🔹 Added this import

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
  bool _isResending = false; // 🔹 Added for resend state
  late String
  _currentVerificationId; // 🔹 Added to handle updated verification IDs

  @override
  void initState() {
    super.initState();
    _currentVerificationId = widget.verificationId;
  }

  void _verifyOtp() async {
    setState(() => _isLoading = true);

    try {
      final userCred = await authService.value.verifyOtpAndRegister(
        verificationId:
            _currentVerificationId, // 🔹 Use state variable instead of widget variable
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

      // 🔹 Pops back until it hits the AuthWrapper/Login to prevent stack buildup
      Navigator.of(context).popUntil((route) => route.isFirst);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Account created successfully!"),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Invalid OTP: $e"),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // 🔹 Fully functional Resend Logic
  void _resendCode() async {
    setState(() => _isResending = true);

    await authService.value.sendOtp(
      phoneNumber: widget.phone,
      codeSent: (newVerificationId) {
        if (mounted) {
          setState(() {
            _currentVerificationId = newVerificationId; // Update with new ID
            _isResending = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("New code sent!"),
              backgroundColor: Colors.green,
            ),
          );
        }
      },
      onError: (error) {
        if (mounted) {
          setState(() => _isResending = false);
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
        child: SingleChildScrollView(
          // 🔹 Wrapped in SingleChildScrollView to prevent overflow when keyboard opens
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
                    Navigator.pop(
                      context,
                    ); // 🔹 Safely pop off the stack instead of pushing a new page
                  },
                ),
              ),

              const SizedBox(
                height: 60,
              ), // Reduced slightly to account for keyboard space
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
                  textAlign: TextAlign.center,
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
                      border: Border.all(
                        color: const Color(0xFF162447),
                        width: 2,
                      ), // 🔹 Matched app aesthetic
                    ),
                  ),
                  submittedPinTheme: defaultPinTheme.copyWith(
                    decoration: defaultPinTheme.decoration!.copyWith(
                      border: Border.all(color: const Color(0xFF162447)),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 20),

              Center(
                child: TextButton(
                  onPressed: _isResending
                      ? null
                      : _resendCode, // 🔹 Added Resend trigger
                  child: _isResending
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text(
                          "Resend code",
                          style: TextStyle(
                            color: Color(0xFF162447),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),

              const SizedBox(height: 12),

              // 🔹 Unified CustomButton usage
              CustomButton(
                text: "Continue",
                isLoading: _isLoading,
                onPressed: _verifyOtp,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
