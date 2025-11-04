import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class CustomTextField extends StatefulWidget {
  final TextEditingController controller;
  final String hintText;
  final bool obscureText;
  final TextInputType keyboardType;

  const CustomTextField({
    super.key,
    required this.controller,
    required this.hintText,
    this.obscureText = false,
    this.keyboardType = TextInputType.text,
  });

  @override
  State<CustomTextField> createState() => _CustomTextFieldState();
}

class _CustomTextFieldState extends State<CustomTextField> {
  bool _isObscured = true;
  String? _errorText;

  @override
  void initState() {
    super.initState();
    _isObscured = widget.obscureText;

    // Real-time validation listener
    if (widget.keyboardType == TextInputType.phone) {
      widget.controller.addListener(_validatePhone);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_validatePhone);
    super.dispose();
  }

  /// Validate Philippine phone numbers
  void _validatePhone() {
    final input = widget.controller.text.replaceAll(' ', '');

    if (input.isEmpty) {
      setState(() => _errorText = null);
      return;
    }

    if (!RegExp(r'^[9]\d{9}$').hasMatch(input)) {
      setState(
        () => _errorText = "Enter a valid Philippine number (e.g. 9XXXXXXXXX)",
      );
    } else {
      setState(() => _errorText = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isPhoneField = widget.keyboardType == TextInputType.phone;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: widget.controller,
          obscureText: widget.obscureText ? _isObscured : false,
          keyboardType: widget.keyboardType,
          inputFormatters: isPhoneField
              ? [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(10),
                  _PhoneNumberFormatter(),
                ]
              : null,
          decoration: InputDecoration(
            prefixIcon: isPhoneField
                ? Padding(
                    padding: const EdgeInsets.only(left: 12, top: 14),
                    child: Text(
                      '+63 ',
                      style: const TextStyle(
                        fontSize: 16,
                        color: Colors.black87,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  )
                : null,
            hintText: widget.hintText,
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
            errorText: _errorText,
            suffixIcon: widget.obscureText
                ? IconButton(
                    icon: Icon(
                      _isObscured ? Icons.visibility_off : Icons.visibility,
                      color: Colors.grey,
                    ),
                    onPressed: () {
                      setState(() {
                        _isObscured = !_isObscured;
                      });
                    },
                  )
                : null,
          ),
          style: const TextStyle(fontSize: 16),
        ),
      ],
    );
  }
}

/// Custom formatter that inserts spaces automatically for readability
class _PhoneNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    var text = newValue.text.replaceAll(' ', '');

    // Format as 4-3-3 (like 9123 456 789)
    final buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      buffer.write(text[i]);
      if (i == 3 || i == 6) buffer.write(' ');
    }

    final formatted = buffer.toString();
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
