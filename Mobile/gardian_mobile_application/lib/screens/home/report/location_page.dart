import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'analysis_loading_page.dart';

class LocationPage extends StatefulWidget {
  final File imageFile;
  final Map<String, dynamic>? yoloResults;

  const LocationPage({super.key, required this.imageFile, this.yoloResults});

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
      await Geolocator.openLocationSettings();
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Location permission denied')),
        );
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Location permission permanently denied')),
      );
      return;
    }

    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );

    setState(() {
      _selectedCoordinate = LatLng(position.latitude, position.longitude);
      _loading = false;
    });

    _mapController?.animateCamera(
      CameraUpdate.newLatLngZoom(_selectedCoordinate!, 17),
    );
  }

  Future<void> _processAndConfirm() async {
    if (_selectedCoordinate == null) return;

    try {
      setState(() => _processing = true);

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => AnalysisLoadingPage(
            imageFile: widget.imageFile,
            selectedCoordinate: _selectedCoordinate!,
          ),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text("Error proceeding: $e")));
    } finally {
      setState(() => _processing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Select Location")),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                GoogleMap(
                  onMapCreated: (controller) => _mapController = controller,
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
                Positioned(
                  bottom: 20,
                  left: 20,
                  right: 20,
                  child: ElevatedButton.icon(
                    onPressed: _processing ? null : _processAndConfirm,
                    icon: const Icon(Icons.cloud_upload_outlined),
                    label: Text(
                      _processing ? "Processing..." : "Continue to Confirm",
                    ),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
