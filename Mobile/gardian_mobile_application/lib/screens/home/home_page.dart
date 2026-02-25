import 'package:flutter/material.dart';
import 'report/issue_type_selection_page.dart';
import '../../widgets/report_history.dart';
import '../../widgets/home_header.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  Set<String> _activeFilters = {"All"};

  // 🔹 Separated the filters into logical groups
  final List<String> _typeFilters = ["All", "Drainage", "Pothole"];
  final List<String> _statusFilters = ["Pending", "Resolved", "Withdrawn"];

  // 🔹 Unified the app theme color
  final Color navyColor = const Color(0xFF162447);

  void _toggleFilter(String filter) {
    setState(() {
      if (filter == 'All') {
        _activeFilters = {'All'};
      } else {
        _activeFilters.remove('All');

        if (_activeFilters.contains(filter)) {
          _activeFilters.remove(filter);
        } else {
          _activeFilters.add(filter);
        }

        // If user unchecks everything, default back to 'All'
        if (_activeFilters.isEmpty) {
          _activeFilters.add('All');
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const HomeHeader(),

          const SizedBox(height: 16),

          // 🔹 Section Title
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              "My Reports",
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: navyColor,
              ),
            ),
          ),

          const SizedBox(height: 12),

          // 🔹 FILTER SECTION 1: Issue Type
          _buildFilterRow("Issue Type", _typeFilters),

          const SizedBox(height: 8),

          // 🔹 FILTER SECTION 2: Status
          _buildFilterRow("Status", _statusFilters),

          const SizedBox(height: 12),

          // 🔹 REPORT LIST
          Expanded(child: ReportHistory(selectedFilters: _activeFilters)),
        ],
      ),

      // 🔹 FLOATING ACTION BUTTON
      floatingActionButton: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.green.withOpacity(0.3),
              blurRadius: 15,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: FloatingActionButton.extended(
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const IssueTypeSelectionPage()),
            );
          },
          backgroundColor: Colors.green,
          elevation: 0,
          icon: const Icon(Icons.add_a_photo_rounded, color: Colors.white),
          label: const Text(
            "Report an Issue",
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          extendedPadding: const EdgeInsets.symmetric(horizontal: 32.0),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  // 🔹 Helper Widget for clean, reusable filter rows
  Widget _buildFilterRow(String title, List<String> filters) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Text(
            title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade600,
            ),
          ),
        ),
        const SizedBox(height: 6),
        SizedBox(
          height: 36, // Sleek height
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: filters.length,
            itemBuilder: (context, index) {
              final filter = filters[index];
              bool isSelected = _activeFilters.contains(filter);

              return Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: FilterChip(
                  label: Text(filter),
                  selected: isSelected,
                  onSelected: (_) => _toggleFilter(filter),
                  selectedColor: navyColor,
                  checkmarkColor: Colors.white,
                  showCheckmark: false,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : Colors.grey.shade700,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    fontSize: 13,
                  ),
                  backgroundColor: Colors.white,
                  side: BorderSide(
                    color: isSelected ? navyColor : Colors.grey.shade300,
                    width: 1,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
