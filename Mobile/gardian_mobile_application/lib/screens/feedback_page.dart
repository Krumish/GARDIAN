import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../services/auth_services.dart';

class FeedbackPage extends StatefulWidget {
  const FeedbackPage({super.key});

  @override
  State<FeedbackPage> createState() => _FeedbackPageState();
}

class _FeedbackPageState extends State<FeedbackPage> {
  final TextEditingController _feedbackController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  String? _selectedCategory;
  bool _isSubmitting = false;

  final List<String> _categories = [
    "Bug Report",
    "Feature Suggestion",
    "App Improvement",
    "Report Accuracy",
    "Other",
  ];

  Future<void> _submitFeedback() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      final uid = authService.value.currentUser?.uid;

      await FirebaseFirestore.instance.collection('feedback').add({
        'userId': uid ?? 'anonymous',
        'category': _selectedCategory,
        'content': _feedbackController.text.trim(),
        'submittedAt': FieldValue.serverTimestamp(),
        'status': 'unread',
      });

      if (mounted) {
        // 🔹 CLEAR FIELDS HERE
        setState(() {
          _feedbackController.clear();
          _selectedCategory = null;
        });

        // Reset the form validation state visually
        _formKey.currentState?.reset();

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Thank you! Feedback submitted."),
            backgroundColor: Colors.green, // Changed to green for success
          ),
        );

        // 🔹 Navigate back if possible
        if (Navigator.canPop(context)) {
          // Add a small delay so the user sees the field clear before the page closes
          Future.delayed(const Duration(milliseconds: 500), () {
            if (mounted) Navigator.pop(context);
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Error: $e"),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  void dispose() {
    _feedbackController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "How can we improve GARDIAN?",
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF122D5A),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                "Your feedback helps us make the city safer for everyone.",
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 25),

              // 🔹 Category Dropdown
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                decoration: InputDecoration(
                  labelText: "Category",
                  filled: true,
                  fillColor: Colors.grey[50],
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: Color(0xFF122D5A),
                      width: 2,
                    ),
                  ),
                ),
                items: _categories.map((cat) {
                  return DropdownMenuItem(value: cat, child: Text(cat));
                }).toList(),
                onChanged: (val) => setState(() => _selectedCategory = val),
                validator: (val) =>
                    val == null ? "Please select a category" : null,
              ),

              const SizedBox(height: 20),

              // 🔹 Feedback Text Box
              TextFormField(
                controller: _feedbackController,
                maxLines: 6,
                decoration: InputDecoration(
                  hintText: "Tell us more about your experience...",
                  alignLabelWithHint: true,
                  filled: true,
                  fillColor: Colors.grey[50],
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: Color(0xFF122D5A),
                      width: 2,
                    ),
                  ),
                ),
                validator: (val) => (val == null || val.isEmpty)
                    ? "Feedback cannot be empty"
                    : null,
              ),

              const SizedBox(height: 30),

              // 🔹 Submit Button
              SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submitFeedback,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isSubmitting
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                          "Submit Feedback",
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
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
