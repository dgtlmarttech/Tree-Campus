const fs = require('fs');
const path = 'C:\\treecampus-raj-dev\\lib\\views\\dashboard\\home_screen.dart';

let content = fs.readFileSync(path, 'utf8');

// 1. Imports
if (!content.includes('config_service.dart')) {
    content = content.replace("import 'package:flutter/material.dart';", 
        "import 'package:flutter/material.dart';\nimport 'package:url_launcher/url_launcher.dart';\nimport 'package:tree_campus/services/config_service.dart';");
}

// 2. State variables
if (!content.includes('whatsappConfig')) {
    content = content.replace("final liveClassesVideosHindi = [", 
        "Map<String, dynamic> whatsappConfig = {'link': '', 'isEnabled': false};\n    final liveClassesVideosHindi = [");
}

// 3. Add to initState
if (!content.includes('_loadWhatsappConfig();')) {
    content = content.replace(/context\.read<CourseViewModel>\(\)\.fetchCourses\(\);\s*\}\);/, 
        "context.read<CourseViewModel>().fetchCourses();\n      });\n      _loadWhatsappConfig();");
}

// 4. Add _loadWhatsappConfig method
if (!content.includes('Future<void> _loadWhatsappConfig()')) {
    const loadMethod = `
    Future<void> _loadWhatsappConfig() async {
      final cached = await ConfigService.getWhatsappConfig();
      setState(() {
        whatsappConfig = cached;
      });
      await ConfigService.fetchAndCacheWhatsappConfig();
      final latest = await ConfigService.getWhatsappConfig();
      if (mounted) {
        setState(() {
          whatsappConfig = latest;
        });
      }
    }

    Widget sectionHeader(String titleText, {VoidCallback? onViewAll}) {`;
    content = content.replace("Widget sectionHeader(String titleText, {VoidCallback? onViewAll}) {", loadMethod);
}

// 5. Conditional rendering
if (!content.includes('if (whatsappConfig[\'isEnabled\'] == true)')) {
    content = content.replace(/\/\/\s*WhatsApp Community Banner\s*Container\(/, 
        "// WhatsApp Community Banner\n            if (whatsappConfig['isEnabled'] == true)\n            Container(");
}

// 6. onTap logic
if (!content.includes('whatsappConfig[\'link\']')) {
    const onTapReplace = `onTap: () async {
                    final url = Uri.parse(whatsappConfig['link'] ?? '');
                    if (await canLaunchUrl(url)) {
                      await launchUrl(url, mode: LaunchMode.externalApplication);
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Could not launch WhatsApp link')),
                      );
                    }
                  },`;
    content = content.replace(/onTap:\s*\(\)\s*\{[^}]*\},/, onTapReplace);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Update complete.');
