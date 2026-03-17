import 'package:flutter/material.dart';

class BlockageAssessmentCard extends StatelessWidget {
  final double blockagePercent;

  const BlockageAssessmentCard({super.key, required this.blockagePercent});

  // Keep the logic tied to the widget that actually uses it
  String _blockageLabel(double percent) {
    if (percent >= 50) return "Clogged";
    if (percent >= 10) return "Partially Blocked";
    return "Clear";
  }

  Color _blockageColor(double percent) {
    if (percent >= 50) return Colors.red;
    if (percent >= 10) return Colors.orange;
    return Colors.green;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.grey.shade200, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Blockage Severity",
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: LinearProgressIndicator(
                    value: (blockagePercent / 100).clamp(0.0, 1.0),
                    minHeight: 12,
                    backgroundColor: Colors.grey.shade200,
                    color: _blockageColor(blockagePercent),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Text(
                "${blockagePercent.toStringAsFixed(1)}%",
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: _blockageColor(blockagePercent),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _blockageLabel(blockagePercent),
            style: TextStyle(
              color: _blockageColor(blockagePercent),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
