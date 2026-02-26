import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:pinput/pinput.dart';
import '../../services/auth_services.dart';
import '../../widgets/custom_button.dart';

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
  bool _isResending = false;
  late String _currentVerificationId;

  @override
  void initState() {
    super.initState();
    _currentVerificationId = widget.verificationId;
  }

  String _getFriendlyErrorMessage(dynamic error) {
    if (error is FirebaseAuthException) {
      switch (error.code) {
        case 'invalid-verification-code':
          return "The confirmation code is incorrect. Please try again.";
        case 'invalid-verification-id':
        case 'session-expired':
          return "The verification session has expired. Please request a new code.";
        case 'too-many-requests':
          return "Too many attempts. Please try again later.";
        case 'network-request-failed':
          return "Network error. Please check your internet connection.";
        default:
          return "Verification failed. Please try again.";
      }
    }
    return "Something went wrong. Please check your connection and try again.";
  }

  void _verifyOtp() async {
    setState(() => _isLoading = true);

    try {
      final userCred = await authService.value.verifyOtpAndRegister(
        verificationId: _currentVerificationId,
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

      // Pops back until it hits the AuthWrapper/Login to prevent stack buildup
      Navigator.of(context).popUntil((route) => route.isFirst);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Account created successfully!"),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_getFriendlyErrorMessage(e)),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _resendCode() async {
    setState(() => _isResending = true);

    await authService.value.sendOtp(
      phoneNumber: widget.phone,
      codeSent: (newVerificationId) {
        if (mounted) {
          setState(() {
            _currentVerificationId = newVerificationId;
            _isResending = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("New code sent!"),
              backgroundColor: Colors.green,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      },
      onError: (error) {
        if (mounted) {
          setState(() => _isResending = false);
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
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Align(
                alignment: Alignment.topLeft,
                child: IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.black87),
                  onPressed: () {
                    Navigator.pop(context);
                  },
                ),
              ),

              const SizedBox(height: 60),

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

              // PIN INPUT
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
                      ),
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
                  onPressed: _isResending ? null : _resendCode,
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
