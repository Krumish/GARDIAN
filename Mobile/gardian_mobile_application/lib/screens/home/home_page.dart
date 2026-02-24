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
  // 🔹 1. Change from String to Set<String> to track multiple selected filters
  Set<String> _activeFilters = {"All"};

  // 🔹 2. Added "Withdrawn" to the list
  final List<String> _filters = [
    "All",
    "Drainage",
    "Pothole",
    "Pending",
    "Resolved",
    "Withdrawn",
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Column(
        children: [
          const HomeHeader(),

          // 🔹 FILTER SECTION
          Container(
            height: 60,
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 15),
              itemCount: _filters.length,
              itemBuilder: (context, index) {
                final filter = _filters[index];

                // 🔹 3. Check if the Set contains this filter
                bool isSelected = _activeFilters.contains(filter);

                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: FilterChip(
                    label: Text(filter),
                    selected: isSelected,
                    onSelected: (bool selected) {
                      setState(() {
                        // 🔹 4. Logic for multiple selections
                        if (filter == 'All') {
                          // If they tap 'All', clear everything else
                          _activeFilters = {'All'};
                        } else {
                          // Remove 'All' if they select a specific filter
                          _activeFilters.remove('All');

                          if (selected) {
                            _activeFilters.add(filter); // Add the new filter
                          } else {
                            _activeFilters.remove(filter); // Remove the filter

                            // If they unselect everything, default back to 'All'
                            if (_activeFilters.isEmpty) {
                              _activeFilters.add('All');
                            }
                          }
                        }
                      });
                    },
                    selectedColor: const Color(0xFF122D5A),
                    checkmarkColor: Colors.white,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : Colors.black87,
                      fontWeight: isSelected
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                    backgroundColor: Colors.grey[200],
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                );
              },
            ),
          ),

          // 🔹 5. Pass the Set of filters to the ReportHistory widget
          // Note: Make sure ReportHistory is expecting 'selectedFilters' (plural) as defined in the previous step
          Expanded(child: ReportHistory(selectedFilters: _activeFilters)),
        ],
      ),

      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const IssueTypeSelectionPage()),
          );
        },
        backgroundColor: Colors.green,
        label: const Text(
          "Report an Issue",
          style: TextStyle(fontSize: 20, color: Colors.white),
        ),
        extendedPadding: const EdgeInsets.symmetric(horizontal: 90.0),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }
}
