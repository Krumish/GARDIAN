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

  late String _currentStatus;
  bool _isWithdrawing = false;

  final Color _navyColor = const Color(0xFF122D5A);

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.data['status'] ?? "Pending";
  }

  Color _blockageColor(double percent) {
    if (percent >= 60) return Colors.red.shade600;
    if (percent >= 25) return Colors.orange.shade600;
    return Colors.green.shade600;
  }

  String _blockageLabel(double percent) {
    if (percent >= 60) return "Clogged";
    if (percent >= 25) return "Partially Blocked";
    return "Clear";
  }

  Color get _statusColor {
    if (_currentStatus == "Resolved") return Colors.green.shade600;
    if (_currentStatus == "Withdrawn") return Colors.grey.shade600;
    return Colors.orange.shade600; // Pending
  }

  IconData get _statusIcon {
    if (_currentStatus == "Resolved") return Icons.check_circle_rounded;
    if (_currentStatus == "Withdrawn") return Icons.cancel_rounded;
    return Icons.access_time_filled_rounded; // Pending
  }

  Future<void> _withdrawReport() async {
    bool confirm =
        await showDialog(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: Colors.white,
            title: const Row(
              children: [
                Icon(
                  Icons.warning_amber_rounded,
                  color: Colors.redAccent,
                  size: 28,
                ),
                SizedBox(width: 10),
                Text(
                  "Withdraw Report",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
                ),
              ],
            ),
            content: Text(
              "Are you sure you want to withdraw this report? This action cannot be undone.",
              style: TextStyle(color: Colors.grey.shade700, fontSize: 16),
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            actionsPadding: const EdgeInsets.only(bottom: 16, right: 16),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text(
                  "Cancel",
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.redAccent,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 10,
                  ),
                ),
                onPressed: () => Navigator.pop(context, true),
                child: const Text(
                  "Withdraw",
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirm) return;

    setState(() => _isWithdrawing = true);
    try {
      final uid = authService.value.currentUser?.uid;
      if (uid == null) throw Exception("User not authenticated.");

      await FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .collection('uploads')
          .doc(widget.reportId)
          .update({'status': 'Withdrawn'});

      setState(() {
        _currentStatus = 'Withdrawn';
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text("Report withdrawn successfully."),
            backgroundColor: Colors.grey.shade800,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Error withdrawing report: $e"),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      setState(() => _isWithdrawing = false);
    }
  }

  // Helper function to build modern cards
  Widget _buildCard({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: child,
    );
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
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Text(
          "Report Details",
          style: TextStyle(
            color: _navyColor,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(color: _navyColor),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // --- 🖼 IMAGE WITH PINCH-TO-ZOOM ---
          if (normalUrl != null)
            Column(
              children: [
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 15,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: InteractiveViewer(
                      panEnabled: true,
                      minScale: 1.0,
                      maxScale: 4.0,
                      child: Image.network(
                        _imageView.first == 'Annotated' && annotatedUrl != null
                            ? annotatedUrl
                            : normalUrl,
                        height: 280,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        loadingBuilder: (context, child, loadingProgress) {
                          if (loadingProgress == null) return child;
                          return Container(
                            height: 280,
                            width: double.infinity,
                            color: Colors.grey.shade200,
                            child: const Center(
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Segmented Button Toggle
                if (annotatedUrl != null)
                  SizedBox(
                    width: double.infinity,
                    child: SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(
                          value: 'Normal',
                          label: Text('Normal View'),
                          icon: Icon(Icons.photo_rounded),
                        ),
                        ButtonSegment(
                          value: 'Annotated',
                          label: Text('AI Annotated'),
                          icon: Icon(Icons.analytics_rounded),
                        ),
                      ],
                      selected: _imageView,
                      onSelectionChanged: (Set<String> newSelection) {
                        setState(() => _imageView = newSelection);
                      },
                      style: ButtonStyle(
                        backgroundColor: WidgetStateProperty.resolveWith<Color>(
                          (Set<WidgetState> states) {
                            if (states.contains(WidgetState.selected)) {
                              return _navyColor.withOpacity(0.1);
                            }
                            return Colors.white;
                          },
                        ),
                        foregroundColor: WidgetStateProperty.resolveWith<Color>(
                          (Set<WidgetState> states) {
                            if (states.contains(WidgetState.selected)) {
                              return _navyColor;
                            }
                            return Colors.grey.shade600;
                          },
                        ),
                        side: WidgetStateProperty.all(
                          BorderSide(color: Colors.grey.shade300),
                        ),
                      ),
                    ),
                  ),
              ],
            ),

          const SizedBox(height: 20),

          // --- 📄 REPORT HEADER ---
          _buildCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        issueType,
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: _navyColor,
                        ),
                      ),
                    ),

                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: _statusColor,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: _statusColor.withOpacity(0.3),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(_statusIcon, color: Colors.white, size: 14),
                          const SizedBox(width: 6),
                          Text(
                            _currentStatus,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Date Row
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.calendar_today_rounded,
                        size: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      formattedDate,
                      style: TextStyle(
                        color: Colors.grey.shade700,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Location Row
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.location_on_rounded,
                        size: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        address,
                        style: TextStyle(
                          color: Colors.grey.shade700,
                          fontSize: 14,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // --- 📊 BLOCKAGE PERCENTAGE CARD (AI UI) ---
          if (issueType == "Drainage" && blockagePercent != null) ...[
            _buildCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.analytics_rounded,
                        color: _navyColor,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        "AI Blockage Assessment",
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: _navyColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: Stack(
                          children: [
                            Container(
                              height: 14,
                              decoration: BoxDecoration(
                                color: Colors.grey.shade200,
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            FractionallySizedBox(
                              widthFactor: blockagePercent / 100,
                              child: Container(
                                height: 14,
                                decoration: BoxDecoration(
                                  color: _blockageColor(blockagePercent),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      SizedBox(
                        width: 50,
                        child: Text(
                          "${blockagePercent.toStringAsFixed(1)}%",
                          textAlign: TextAlign.right,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: _blockageColor(blockagePercent),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Status: ${_blockageLabel(blockagePercent)}",
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontWeight: FontWeight.w500,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // --- 📝 NOTES ---
          if (note.toString().trim().isNotEmpty) ...[
            _buildCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.notes_rounded, size: 20, color: _navyColor),
                      const SizedBox(width: 8),
                      Text(
                        "Additional Notes",
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: _navyColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    note,
                    style: TextStyle(
                      height: 1.6,
                      color: Colors.grey.shade800,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // --- 🗺️ MAP ---
          if (lat != null && lng != null) ...[
            Container(
              height: 220,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 15,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
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
                  scrollGesturesEnabled: false,
                ),
              ),
            ),
            const SizedBox(height: 30),
          ],

          // --- ❌ WITHDRAW BUTTON ---
          if (_currentStatus == "Pending")
            SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton.icon(
                onPressed: _isWithdrawing ? null : _withdrawReport,
                icon: _isWithdrawing
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(
                        Icons.delete_outline_rounded,
                        color: Colors.white,
                      ),
                label: Text(
                  _isWithdrawing ? "Withdrawing..." : "Withdraw Report",
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.redAccent,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
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
