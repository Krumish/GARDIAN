import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:intl/intl.dart';
import '../services/auth_services.dart';

class ReportDetailPage extends StatefulWidget {
  final String reportId;
  final Map<String, dynamic> data;

  const ReportDetailPage({
    super.key,
    required this.reportId,
    required this.data,
  });

  @override
  State<ReportDetailPage> createState() => _ReportDetailPageState();
}

class _ReportDetailPageState extends State<ReportDetailPage> {
  Set<String> _imageView = {'Normal'};

  // 🔹 Local state to track status and loading
  late String _currentStatus;
  bool _isWithdrawing = false;

  @override
  void initState() {
    super.initState();
    // Initialize the status from the passed data
    _currentStatus = widget.data['status'] ?? "Pending";
  }

  Color _blockageColor(double percent) {
    if (percent >= 60) return Colors.red;
    if (percent >= 25) return Colors.orange;
    return Colors.green;
  }

  String _blockageLabel(double percent) {
    if (percent >= 60) return "Clogged";
    if (percent >= 25) return "Partially Blocked";
    return "Clear";
  }

  // 🔹 Determine status color dynamically
  Color get _statusColor {
    if (_currentStatus == "Resolved") return Colors.green;
    if (_currentStatus == "Withdrawn") return Colors.grey;
    return Colors.redAccent; // Pending
  }

  // 🔹 Function to handle withdrawing the report
  // 🔹 Function to handle withdrawing the report
  Future<void> _withdrawReport() async {
    // 1. Show Confirmation Dialog
    bool confirm =
        await showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text(
              "Withdraw Report",
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            content: const Text(
              "Are you sure you want to withdraw this report? This action cannot be undone.",
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text(
                  "Cancel",
                  style: TextStyle(color: Colors.grey),
                ),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.redAccent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                onPressed: () => Navigator.pop(context, true),
                child: const Text(
                  "Withdraw",
                  style: TextStyle(color: Colors.white),
                ),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirm) return;

    // 2. Update Firebase
    setState(() => _isWithdrawing = true);
    try {
      final uid = authService.value.currentUser?.uid;

      if (uid == null) throw Exception("User not authenticated.");

      //  Update the specific document in the user's 'uploads' subcollection
      await FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .collection('uploads')
          .doc(widget.reportId)
          .update({'status': 'Withdrawn'});

      // 3. Update local state
      setState(() {
        _currentStatus = 'Withdrawn';
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Report withdrawn successfully.")),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text("Error withdrawing report: $e")));
      }
    } finally {
      setState(() => _isWithdrawing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final normalUrl = widget.data['url'];
    final annotatedUrl = widget.data['annotatedUrl'];
    final issueType = widget.data['issueType'] ?? "Unknown";
    final address = widget.data['address'] ?? "No address provided";
    final note = widget.data['note'] ?? "";
    final yolo = widget.data['yolo'] as Map<String, dynamic>? ?? {};

    final lat = double.tryParse(widget.data['latitude']?.toString() ?? "");
    final lng = double.tryParse(widget.data['longitude']?.toString() ?? "");
    final double? blockagePercent = yolo['blockage_percent']?.toDouble();

    String formattedDate = "Unknown Date";
    if (widget.data['uploadedAt'] != null) {
      DateTime dt = (widget.data['uploadedAt'] as Timestamp).toDate();
      formattedDate = DateFormat('MMM dd, yyyy • hh:mm a').format(dt);
    }

    return Scaffold(
      appBar: AppBar(title: const Text("Report Details"), elevation: 0),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // --- 🖼 IMAGE WITH PINCH-TO-ZOOM ---
          if (normalUrl != null)
            Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: InteractiveViewer(
                    panEnabled: true,
                    minScale: 1.0,
                    maxScale: 4.0,
                    child: Image.network(
                      _imageView.first == 'Annotated' && annotatedUrl != null
                          ? annotatedUrl
                          : normalUrl,
                      height: 250,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                if (annotatedUrl != null)
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(
                        value: 'Normal',
                        label: Text('Normal View'),
                      ),
                      ButtonSegment(
                        value: 'Annotated',
                        label: Text('AI Annotated'),
                      ),
                    ],
                    selected: _imageView,
                    onSelectionChanged: (Set<String> newSelection) {
                      setState(() => _imageView = newSelection);
                    },
                  ),
              ],
            ),

          const SizedBox(height: 16),

          // --- 📄 REPORT HEADER ---
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        issueType,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      // 🔹 Status Badge (Now uses local _currentStatus)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: _statusColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: _statusColor),
                        ),
                        child: Text(
                          _currentStatus,
                          style: TextStyle(
                            color: _statusColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(
                        Icons.access_time,
                        size: 16,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        formattedDate,
                        style: const TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 16,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          address,
                          style: const TextStyle(color: Colors.black87),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 12),

          // --- 📊 BLOCKAGE PERCENTAGE CARD ---
          if (issueType == "Drainage" && blockagePercent != null)
            Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Drainage Blockage Assessment",
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(5),
                            child: LinearProgressIndicator(
                              value: blockagePercent / 100,
                              minHeight: 12,
                              backgroundColor: Colors.grey.shade300,
                              color: _blockageColor(blockagePercent),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
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
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          const SizedBox(height: 12),

          // --- 📝 NOTES ---
          if (note.toString().trim().isNotEmpty)
            Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.notes, size: 20, color: Colors.grey),
                        SizedBox(width: 8),
                        Text(
                          "Additional Notes",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(note, style: const TextStyle(height: 1.5)),
                  ],
                ),
              ),
            ),

          const SizedBox(height: 12),

          // --- 🗺️ MAP ---
          if (lat != null && lng != null)
            Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  height: 200,
                  child: GoogleMap(
                    initialCameraPosition: CameraPosition(
                      target: LatLng(lat, lng),
                      zoom: 16,
                    ),
                    markers: {
                      Marker(
                        markerId: MarkerId(widget.reportId),
                        position: LatLng(lat, lng),
                      ),
                    },
                    zoomControlsEnabled: false,
                    mapToolbarEnabled: false,
                    myLocationEnabled: false,
                  ),
                ),
              ),
            ),

          const SizedBox(height: 24),

          // --- ❌ WITHDRAW BUTTON ---
          // Only show this button if the report is still "Pending"
          if (_currentStatus == "Pending")
            SizedBox(
              width: double.infinity,
              height: 55,
              child: OutlinedButton.icon(
                onPressed: _isWithdrawing ? null : _withdrawReport,
                icon: _isWithdrawing
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.redAccent,
                        ),
                      )
                    : const Icon(
                        Icons.cancel_outlined,
                        color: Colors.redAccent,
                      ),
                label: Text(
                  _isWithdrawing ? "Withdrawing..." : "Withdraw Report",
                  style: const TextStyle(
                    color: Colors.redAccent,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.redAccent),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),

          const SizedBox(height: 40),
        ],
      ),
    );
  }
}
