import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'analysis_loading_page.dart';

class LocationPage extends StatefulWidget {
  final File imageFile;
  final String issueType;

  const LocationPage({
    super.key,
    required this.imageFile,
    required this.issueType,
  });

  @override
  State<LocationPage> createState() => _LocationPageState();
}

class _LocationPageState extends State<LocationPage> {
  LatLng? _selectedCoordinate;
  GoogleMapController? _mapController;
  bool _loading = true;
  bool _processing = false;

  @override
  void initState() {
    super.initState();
    _initCurrentLocation();
  }

  Future<void> _initCurrentLocation() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      // 🔹 FIX: Stop loading if service is disabled
      if (mounted) setState(() => _loading = false);
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (mounted) {
          setState(() => _loading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location permission denied')),
          );
        }
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Location permission permanently denied'),
          ),
        );
      }
      return;
    }

    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );

    if (mounted) {
      setState(() {
        _selectedCoordinate = LatLng(position.latitude, position.longitude);
        _loading = false;
      });
    }

    _mapController?.animateCamera(
      CameraUpdate.newLatLngZoom(_selectedCoordinate!, 17),
    );
  }

  Future<void> _processAndConfirm() async {
    if (_selectedCoordinate == null) return;

    setState(() => _processing = true);

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => AnalysisLoadingPage(
          imageFile: widget.imageFile,
          selectedCoordinate: _selectedCoordinate!,
          issueType: widget.issueType,
        ),
      ),
    );

    setState(() => _processing = false);
  }

  @override
  Widget build(BuildContext context) {
    const navyColor = Color(0xFF122D5A);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "Pinpoint Location",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        backgroundColor: navyColor,
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
      ),
      body: _loading
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: navyColor),
                  SizedBox(height: 16),
                  Text(
                    "Acquiring GPS Signal...",
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            )
          : Stack(
              children: [
                // 🔹 Full Screen Map
                GoogleMap(
                  onMapCreated: (controller) => _mapController = controller,
                  myLocationEnabled:
                      true, // Shows the blue dot for the user's actual location
                  myLocationButtonEnabled:
                      false, // We will build a custom button later if needed
                  compassEnabled: false,
                  mapToolbarEnabled: false,
                  initialCameraPosition: CameraPosition(
                    target:
                        _selectedCoordinate ?? const LatLng(14.5995, 120.9842),
                    zoom: 17,
                  ),
                  markers: _selectedCoordinate != null
                      ? {
                          Marker(
                            markerId: const MarkerId("selected"),
                            position: _selectedCoordinate!,
                            draggable: true,
                            onDragEnd: (newPos) {
                              setState(() => _selectedCoordinate = newPos);
                            },
                          ),
                        }
                      : {},
                  onTap: (pos) => setState(() => _selectedCoordinate = pos),
                ),

                // 🔹 Floating Instruction Card (Top)
                Positioned(
                  top: 16,
                  left: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.touch_app_rounded,
                          color: Colors.blueGrey.shade400,
                          size: 28,
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Text(
                            "Tap the map or drag the pin to adjust the exact location of the issue.",
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.black87,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // 🔹 Action Button (Bottom)
                Positioned(
                  bottom: 32,
                  left: 24,
                  right: 24,
                  child: SizedBox(
                    width: double.infinity,
                    height: 55, // Consistent button height
                    child: ElevatedButton.icon(
                      onPressed: (_processing || _selectedCoordinate == null)
                          ? null
                          : _processAndConfirm,
                      icon: _processing
                          ? const SizedBox.shrink()
                          : const Icon(Icons.analytics_outlined),
                      label: _processing
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text(
                              "Analyze Issue",
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green, // 🔹 Consistent Green
                        foregroundColor: Colors.white,
                        elevation: 4,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(15),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
