import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@2.5.2';
import Handlebars from 'npm:handlebars@4.7.8';

// Brand colors
const COLORS = {
  primary: [102, 126, 234], // #667eea
  secondary: [118, 75, 162], // #764ba2
  text: [26, 26, 26],
  lightText: [73, 80, 87],
  border: [233, 236, 239],
  highlight: [248, 249, 250]
};

// Clean text for PDF rendering - jsPDF helvetica only covers Latin-1 (0x00-0xFF).
// We must explicitly map every known special character before the final strip.
function cleanTextForPDF(text) {
  if (!text) return '';
  return String(text)
    // Typographic quotes -> straight quotes
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    // Dashes: en-dash, em-dash, figure dash, horizontal bar -> hyphen
    .replace(/[\u2013\u2014\u2012\u2015]/g, '-')
    // Arrows
    .replace(/[\u2192\u21D2]/g, '->').replace(/[\u2190\u21D0]/g, '<-').replace(/[\u2194\u21D4]/g, '<->')
    // Ellipsis
    .replace(/\u2026/g, '...')
    // Checkmarks and crosses
    .replace(/[\u2713\u2714]/g, '[YES]').replace(/[\u2717\u2718]/g, '[NO]')
    // Common emoji replacements (strip the emoji, keep readable text)
    .replace(/\u{1F4CA}/gu, '[CHART]').replace(/\u{1F527}/gu, '[TOOL]')
    .replace(/\u{1F4C8}/gu, '[GRAPH]').replace(/\u{1F4CD}/gu, '[PIN]')
    .replace(/\u{1F393}/gu, '[GRAD]').replace(/\u{1F916}/gu, '[AI]')
    .replace(/\u{1F4F1}/gu, '[MOBILE]').replace(/\u{1F4F8}/gu, '[CAMERA]')
    .replace(/\u{1F4AC}/gu, '[CHAT]').replace(/\u{2728}/gu, '[NEW]')
    .replace(/\u{1F680}/gu, '[LAUNCH]').replace(/\u{1F6E0}/gu, '[TOOLS]')
    .replace(/\u{1F41B}/gu, '[BUG]').replace(/\u{1F510}/gu, '[SECURE]')
    // Bullet / middle dot / star
    .replace(/[\u2022\u00B7\u2027]/g, '-')
    .replace(/[\u25AA\u25C6\u25CF\u2605\u2606]/g, '-')
    // Math symbols
    .replace(/\u2264/g, '<=').replace(/\u2265/g, '>=')
    .replace(/\u00B1/g, '+/-').replace(/\u00D7/g, 'x').replace(/\u00F7/g, '/')
    .replace(/\u00B0/g, 'deg')
    // Micro / mu
    .replace(/(\d+\.?\d*)\s*[\u03BC\u00B5]m/g, '$1um')
    .replace(/[\u03BC\u00B5]/g, 'u')
    // Copyright, registered, trademark
    .replace(/\u00A9/g, '(c)').replace(/\u00AE/g, '(R)').replace(/\u2122/g, '(TM)')
    // Non-breaking space
    .replace(/\u00A0/g, ' ')
    // Fraction/division slash
    .replace(/[\u2044\u2215]/g, '/')
    // Superscript numbers
    .replace(/\u00B9/g, '1').replace(/\u00B2/g, '2').replace(/\u00B3/g, '3')
    // Strip any remaining characters outside printable ASCII (0x20-0x7E) + standard controls
    .replace(/[^\x00-\xFF]/g, '');
}

// Parse content into structured sections
function parseContentStructure(content) {
  const cleanedContent = cleanTextForPDF(content);
  const lines = cleanedContent.trim().split('\n');
  const sections = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === trimmed.toUpperCase() && trimmed.length > 20 && !trimmed.startsWith('[YES]')) {
      sections.push({ isTitle: true, text: trimmed });
    } else if (trimmed.match(/^SECTION \d+:/)) {
      sections.push({ isSection: true, text: trimmed });
    } else if (trimmed.match(/^\d+\.\d+\s+[A-Z]/)) {
      sections.push({ isSubsection: true, text: trimmed });
    } else if (trimmed.startsWith('[YES]') || trimmed.startsWith('[NO]') || trimmed.startsWith('-')) {
      sections.push({ isList: true, text: trimmed });
    } else if (trimmed.includes('IMPORTANT:') || trimmed.includes('CRITICAL:')) {
      sections.push({ isHighlight: true, text: trimmed });
    } else {
      sections.push({ isParagraph: true, text: trimmed });
    }
  }

  return sections;
}

// Professional PDF generation with branded styling
function generatePDF(title, content, type, version = '2.0') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxWidth = pageWidth - (2 * margin);
  let yPosition = margin;
  let currentPage = 1;

  // Helper to add header on each page
  function addHeader() {
    // Gradient background effect (simulate with rectangles)
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 50, 'F');
    doc.setFillColor(...COLORS.secondary);
    doc.rect(pageWidth * 0.7, 0, pageWidth * 0.3, 50, 'F');

    // Logo text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('FIBERORACLE', margin, 32);

    // Document type
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(type.toUpperCase().replace(/_/g, ' '), pageWidth - margin, 32, { align: 'right' });

    yPosition = 70;
  }

  // Helper to add footer on each page
  function addFooter() {
    const footerY = pageHeight - 30;
    
    // Footer line
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(2);
    doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

    // Footer text
    doc.setTextColor(...COLORS.lightText);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('© 2026 FiberOracle | Confidential & Proprietary', margin, footerY);
    doc.text(`Version ${version} | Page ${currentPage}`, pageWidth - margin, footerY, { align: 'right' });
    doc.setFontSize(7);
    doc.text('fiberoracle.com', pageWidth / 2, footerY, { align: 'center' });
  }

  // Check if new page needed
  function checkNewPage(requiredSpace = 30) {
    if (yPosition + requiredSpace > pageHeight - 50) {
      addFooter();
      doc.addPage();
      currentPage++;
      addHeader();
      return true;
    }
    return false;
  }

  // Add first page header
  addHeader();

  // Cover title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  const titleLines = doc.splitTextToSize(title, maxWidth);
  titleLines.forEach(line => {
    checkNewPage(30);
    doc.text(line, margin, yPosition);
    yPosition += 30;
  });

  // Add decorative line under title
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(3);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 20;

  // Parse and render content
  const sections = parseContentStructure(content);

  sections.forEach(section => {
    checkNewPage(20);

    if (section.isTitle) {
      // Major section title
      yPosition += 10;
      checkNewPage(40);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      const lines = doc.splitTextToSize(section.text, maxWidth);
      lines.forEach(line => {
        doc.text(line, margin, yPosition);
        yPosition += 20;
      });
      yPosition += 5;
    } else if (section.isSection) {
      // Section header
      yPosition += 8;
      checkNewPage(35);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.secondary);
      
      // Add colored left border
      doc.setFillColor(...COLORS.primary);
      doc.rect(margin, yPosition - 12, 4, 16, 'F');
      
      doc.text(section.text, margin + 10, yPosition);
      yPosition += 18;
    } else if (section.isSubsection) {
      // Subsection
      yPosition += 5;
      checkNewPage(25);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text(section.text, margin, yPosition);
      yPosition += 16;
    } else if (section.isList) {
      // List item
      checkNewPage(18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      
      // Bullet point
      doc.setFillColor(...COLORS.primary);
      doc.circle(margin + 5, yPosition - 3, 2, 'F');
      
      const lines = doc.splitTextToSize(section.text.substring(1).trim(), maxWidth - 15);
      lines.forEach((line, idx) => {
        if (idx > 0) checkNewPage(14);
        doc.text(line, margin + 15, yPosition);
        yPosition += 14;
      });
    } else if (section.isHighlight) {
      // Highlight box
      checkNewPage(40);
      const boxHeight = 30;
      
      // Background
      doc.setFillColor(...COLORS.highlight);
      doc.roundedRect(margin, yPosition - 10, maxWidth, boxHeight, 3, 3, 'F');
      
      // Left accent
      doc.setFillColor(...COLORS.primary);
      doc.rect(margin, yPosition - 10, 4, boxHeight, 'F');
      
      // Text
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      const lines = doc.splitTextToSize(section.text, maxWidth - 20);
      lines.forEach(line => {
        doc.text(line, margin + 10, yPosition);
        yPosition += 12;
      });
      yPosition += 15;
    } else if (section.isParagraph) {
      // Regular paragraph
      checkNewPage(15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      const lines = doc.splitTextToSize(section.text, maxWidth);
      lines.forEach(line => {
        checkNewPage(14);
        doc.text(line, margin, yPosition);
        yPosition += 14;
      });
      yPosition += 4;
    }
  });

  // Add footer to last page
  addFooter();

  return new Uint8Array(doc.output('arraybuffer'));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = await req.json();

    let pdfContent = '';
    let title = '';
    let category = 'training';

    if (type === 'user_manual') {
      title = 'FiberOracle User Manual v2.1';
      category = 'training';
      pdfContent = `
FIBEROROACLE USER MANUAL v2.1

SECTION 1: WELCOME TO FIBERORACLE
What Is FiberOracle?
FiberOracle is your complete technical toolkit for fiber optic installation, maintenance, testing, and troubleshooting. Whether you're in the field or in the office, FiberOracle provides the tools, references, and AI-powered guidance you need to work efficiently and accurately.

Who Should Use This Manual?
- Field technicians (primary)
- Network engineers and planners
- System administrators and operators
- Managers and supervisors
- Training coordinators

SECTION 2: GETTING STARTED
2.1 First-Time Setup

On Web (Desktop/Laptop):
1. Navigate to https://www.fiberoracle.com
2. Log in with your company email and password
3. (Optional) Set your preference: Traditional Mode or AI-Centric Mode
4. You're ready to go

On Mobile (iOS/Android):
1. Open a browser and go to https://www.fiberoracle.com
2. Log in as above
3. Look for "Install App" prompt
4. Tap "Add to Home Screen" (or "Install" if using Chrome)
5. FiberOracle now appears as an app icon on your home screen

Offline Access: FiberOracle works offline after your first visit. Your previously-accessed documents and tools remain available without internet. When connection returns, data automatically syncs.

SECTION 3: CORE TOOLS GUIDE

3.1 Loss Budget Calculator
What It Does: Calculates total optical power loss from transmitter to receiver.
When to Use: Before fiber installation, verifying link design, troubleshooting power level problems.
How to Use: Open Loss Budget Calculator -> Enter cable length, connectors, splices -> App displays total loss & budget.

3.2 Optical Calculator
Quick conversions: dBm <-> mW, decibels, distance-loss combinations, wavelength references.

3.3 Power Level Calculator
Predict ONT Rx power for GPON and XGS-PON with pass/fail status per ITU-T G.984 and G.9807.

3.4 Fiber Locator
TIA-598 standardized color code lookup for 12 to 3,456 fiber cables.

3.5 Other Tools
- OTDR Analysis: Visualize optical traces and identify faults
- Splitter Loss Reference: Pre-calculated loss values for common configurations
- Fiber Doctor: AI-assisted troubleshooting
- Bend Radius Guide: Safe bending limits for different fiber types

SECTION 4: FIELD WORK & REPORTING

4.1 Creating a Job Report
Why Report: Creates professional record of work, evidence of performance, compliance documentation.
What to Include: Job number, your name, date/time, location, work completed, measurements, photos, issues.

4.2 Photo Capture Integration
Within a Job Report: Tap Add Photo -> Camera opens -> Take photo -> Save to report.
Why This Matters: Photos tied to measurements and site location, creating complete record without separate file management.

4.3 AI-Generated Job Reports
From PON PM Analysis, click the Job button on any ONT to auto-generate a pre-filled job report with AI diagnosis, recommended actions, equipment list, and historical performance trends.

4.4 GPS Location Tagging
Automatic Capture: Location automatically recorded and embedded in all photos/measurements.
Manual Override: If GPS inaccurate, tap Edit Location to manually set coordinates.

SECTION 5: P.H.O.T.O.N. AI AGENT GUIDE

5.1 What Is P.H.O.T.O.N.?
P.H.O.T.O.N. (Portable Hosting Optical Testing Operations Nexus) is your AI expert. It understands your company's fiber optic systems and provides contextual, conversational guidance.

5.2 Accessing P.H.O.T.O.N.
Desktop: Click P.H.O.T.O.N. Chat from main menu
Mobile (Traditional Mode): Tap Chat in bottom navigation
Mobile (AI-Centric Mode): AI chat appears on every page

5.3 How to Use P.H.O.T.O.N.
Start a conversation → Type your question → P.H.O.T.O.N. asks clarifying questions if needed → Get guidance.

5.4 What P.H.O.T.O.N. Can Help With
- [YES] Technical Calculations (power budgets, dB conversions, loss estimates)
- [YES] Troubleshooting Guidance (diagnostic procedures, root cause analysis)
- [YES] Installation Procedures (best practices, safety procedures, equipment specs)
- [YES] Documentation Lookup (find references in knowledge base)
- [YES] Network Analysis (interpret ONT performance data, identify trends)

SECTION 6: DOCUMENTATION & LEARNING

6.1 Accessing the Reference Library
Use the Search function in top header to search by keyword, title, or topic.
From Home: Click Documentation or Reference Library to browse by category.

6.2 Using Fiber 101/102/103 Courses
Purpose: Structured training to build fiber optic expertise.
Each course includes: 10-15 learning modules, calculations, practice questions, final exam.
Completing a Course: Score ≥80% on final exam to pass. Certificate issued upon passing.

6.3 Submitting Documents
Click Submit Document → Choose source (upload, Google Drive, web URL) → Fill in details → Submit.
Admin reviews within 1-2 business days.

SECTION 7: SETTINGS & PREFERENCES

7.1 Account Settings
Click profile avatar → Settings → Configure Full Name, Email, Company/Role, Phone.

7.2 Notification Preferences
Email Notifications, Push Notifications, Sync Alerts.

7.3 Interface Preferences
Theme (Dark/Light), Mode (Traditional/AI-Centric), Language.

7.4 Privacy & Data
Download My Data, Delete Account, Location Services toggle.

SECTION 8: PON PM ANALYSIS & NETWORK MONITORING

8.1 PON PM Analysis
Upload CSV exports from your OLT performance monitoring system. The analyzer classifies each ONT as Critical, Warning, OK, or Offline based on configurable thresholds.

Key views:
- Summary View: Aggregate OLT and port statistics
- Hierarchy View: Drill down from OLT -> port -> ONT
- FEC Corrected View: Identify ONTs with high corrected FEC counts that appear OK but are error-correcting near threshold

8.2 Corrected FEC Analysis
ONTs with non-zero corrected FEC may appear OK but are actively error-correcting, which causes micro-drops and buffering.
- High (10,000+): Likely causing subscriber-impacting issues
- Moderate (1,000-9,999): Approaching concerning levels
- Low (1-999): Non-zero but acceptable

8.3 Capacity Planning
Analyze PON PM reports over time to forecast splitter utilization. Growth rates are calculated using linear regression and flag splitters approaching 90%+ capacity.

8.4 LCP Database & Map
Manage LCP/CLCP inventory with GPS coordinates, splitter ratios, OLT port assignments, optic details, and fiber counts. Interactive map shows all locations with health overlays.

SECTION 9: MOBILE-SPECIFIC TIPS

9.1 Best Practices for Fieldwork
Before: Sync all data, enable WiFi, plug in phone
In Field: Use Dark Mode, landscape orientation, voice input
After: Review reports, add notes, create templates

9.2 Offline-First Workflow
Before losing signal: Sync all data
In field: Create reports, take photos, use calculators (no P.H.O.T.O.N.)
When back in range: Tap Sync Now, reports auto-upload

9.3 Reducing Data Usage
Reference docs cached after first view, photos compressed to 1-2MB, auto-sync every 5 minutes.

SECTION 10: COMMON QUESTIONS & TROUBLESHOOTING

Q: Can I use FiberOracle without internet? 
A: Yes. Core tools work offline. Reference docs accessible if viewed before. Job reports sync when online.

Q: How do I add company procedures?
A: Use Document Submission feature. Upload PDFs, procedures, or guides for admin review.

Q: Can I access on multiple devices?
A: Yes. Log in on any device. Preferences and conversations sync.

Q: How long does sync take?
A: Most syncs complete in 5-30 seconds depending on file size and connection.

Q: What if P.H.O.T.O.N. gives incorrect info?
A: Always verify with supervisor or company standards before acting. Report issues to admin.

Q: Can I export job reports?
A: Yes. From Settings → Download My Data. All reports export as PDF package.

Troubleshooting:
- App won't sync: Check internet → Settings → Force Sync → Restart app
- Photos not saving: Check device storage → Grant app permissions
- P.H.O.T.O.N. not responding: Refresh browser → Restart app → Check internet
- GPS inaccurate: Try outdoors with clear sky or manually enter coordinates

SECTION 11: BEST PRACTICES

[YES] DO:
- Create detailed job reports with photos
- Use P.H.O.T.O.N. for guidance before unfamiliar tasks
- Verify critical calculations twice
- Sync data regularly (especially end-of-day)
- Upload PON PM reports regularly to track trends over time
- Review FEC Corrected analysis to catch degrading links early
- Keep LCP database up to date with GPS coordinates
- Submit useful documents you discover

[NO] DON'T:
- Rely solely on P.H.O.T.O.N. for critical safety decisions
- Take photos of sensitive network architecture
- Forget to GPS-tag locations
- Delete conversations prematurely
- Use outdated documents without checking date

END OF USER MANUAL
`;
    } else if (type === 'quick_reference') {
      title = 'FiberOracle Quick Reference Guide';
      category = 'reference';
      pdfContent = `
FIBERORACLE QUICK REFERENCE GUIDE

HOME PAGE - WHAT CAN I DO?
"I need to calculate power loss" → Loss Budget Calculator (Tools)
"I want to learn fiber optics" → Education → Fiber 101/102/103
"I need to report work" → Field Mode → New Job Report
"I need technical help" → P.H.O.T.O.N. Chat
"I need to find procedures" → Search (top) or Documentation

TOOL TIPS

📊 Loss Budget Calculator
Calculates total power loss to verify link feasibility. Include cable length, connectors, splices, splitters.

🔧 Optical Calculator
Quick conversions: dBm ↔ mW, distance × loss, wavelength reference.

📈 PON PM Analysis
Upload ONT performance reports to spot at-risk equipment and trends.

📍 LCP Map
GPS-enabled map of fiber node locations. Tap for details.

🎓 Certification Exams
Complete courses and take tests to earn fiber optic credentials.

🤖 P.H.O.T.O.N. Chat
Ask technical questions. AI provides instant guidance grounded in company standards.

📱 Field Mode
Create job reports, capture photos, log measurements, GPS locations. Works offline.

FREQUENTLY USED WORKFLOWS

Troubleshoot Low ONT Power Level
1. Go to PON PM Analysis or ask P.H.O.T.O.N.
2. Upload PON report → System highlights at-risk ONTs
3. Describe symptom ("ONT showing -38dBm Rx")
4. Follow guidance step-by-step
5. Document findings in Job Report

Document Installation Work
1. Click Field Mode → New Job Report
2. Fill in: job number, location (auto-GPS), work type
3. Add measurements (before/after power, OTDR results)
4. Tap 📸 to add photos
5. Save (offline) or Submit (online)
6. Photos auto-tagged with time, location, job ID

Find Procedure for Task
Option A - Search:
1. Click Search (top right)
2. Type your task (e.g., "splice 144-fiber ribbon")
3. Browse results and click document

Option B - Ask P.H.O.T.O.N.:
1. Open P.H.O.T.O.N. Chat
2. Ask: "What's the procedure for [task]?"
3. AI pulls from documentation and explains

Share Useful Document
1. Click Submit Document
2. Choose source: upload, Google Drive, or URL
3. Add title, category, description
4. Check "Request Addition to Master List" if applicable
5. Submit
6. Admin reviews within 1-2 days

MOBILE-SPECIFIC QUICK TIPS

Add photo to report: Within report → 📸 → Take photo → ✓
Switch to Dark Mode: Settings (profile) → Theme → Dark
Sync offline data: Settings → Force Sync or auto-sync
Access chat faster: Bottom navigation → Chat (Traditional) or chat icon (AI-Centric)
Find document: Search (top) or Docs in navigation
View location: Job Report → Edit Location (shows map)

QUICK SETTINGS

Account: Profile → Settings → Name, Email, Role, Phone
Notifications: Email, Push (Mobile), Sync Alerts
Interface: Theme (Dark/Light), Mode (Traditional/AI-Centric), Language
Privacy: Download Data, Delete Account, Location Services

SYSTEM REQUIREMENTS

Web Browser: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
Mobile: iOS 13+, Android 10+
Internet: 5+ Mbps recommended, 1+ Mbps minimum, offline tools available
Storage: App ~50MB, Cached docs 100-500MB, Reports 5-20MB/month

HELP & SUPPORT

Can't find answer?
1. Check this guide
2. Ask P.H.O.T.O.N. ("How do I...?")
3. Contact your administrator

Report a Bug:
1. Click Settings → Report Issue
2. Describe what happened
3. Attach screenshot if helpful
4. Admin receives within 24 hours

Privacy Concern?
1. Click Settings → Privacy & Data
2. Review data handling options
3. Contact admin for compliance questions

COMMON ANSWERS

Can I use offline? Yes - core tools work offline, docs cached, reports sync when online.
Add company procedures? Use Document Submission for admin review.
Multiple devices? Yes - log in any device, preferences sync.
How long to sync? 5-30 seconds depending on file size/connection.
If P.H.O.T.O.N. wrong? Always verify with supervisor before critical decisions.
Export reports? Settings → Download My Data.

END OF QUICK REFERENCE
`;
    } else if (type === 'changelog') {
      title = 'FiberOracle v2.1 Changelog - March 2026';
      category = 'other';
      pdfContent = `
FIBERORACLE v2.1 CHANGELOG
"Network Quality Analytics & FEC Diagnostics"
Released: March 2026

[NEW] NEW FEATURES IN v2.1

Corrected FEC Analysis
- New dedicated view in PON PM Analysis identifying ONTs with non-zero corrected FEC codewords
- Severity tiers: High (10k+), Moderate (1k+), Low (1-999)
- Highlights ONTs that appear OK but are operating near error-correction thresholds
- Filters by severity level and direction (upstream/downstream/both)
- Export to CSV for field dispatch

Capacity Planning Dashboard
- Analyzes historical PON PM reports to forecast splitter utilization
- Linear regression growth rate calculation per LCP/splitter
- Time-to-full projections with urgency categorization
- Visual growth charts and filterable projection table

LCP Fiber Count Management
- Editable fiber_count field per LCP entry (default 32)
- Capacity Report identifying LCPs approaching 90% utilization
- Integrated with PON PM data for real-time port usage tracking

Enhanced PON PM Views
- Three-way view toggle: Summary, Hierarchy, FEC Corrected
- Improved LCP enrichment using real-time Map-based lookup
- Background ONT record indexing with real-time progress tracking

[NEW] FEATURES FROM v2.0

P.H.O.T.O.N. AI Agent Integration
- Enterprise AI assistant for fiber optic technicians
- Multi-turn conversations with persistent session history
- Full access to company knowledge base and documentation
- Real-time web search for current technical information

AI-Centric Mode
- New UI layout optimized for AI-first workflows
- Quick-access sidebar with categorized technical tools

Enhanced Reference Documentation System
- Full-text search with fuzzy matching
- User submissions with admin review workflow
- Document versioning and audit trail

[IMPROVED] IMPROVEMENTS

PDF Export Quality
- Robust Unicode-to-Latin-1 text sanitization across all PDF generators
- All special symbols (arrows, bullets, checkmarks, math operators) properly converted
- No more garbled characters or unreadable content in any exported PDF

Performance & Reliability
- Optimized bundle size (18% reduction)
- Faster initial page load
- Improved service worker caching strategy
- Better error boundaries with graceful fallbacks

Mobile Experience
- Bottom navigation bar for quick tool access
- Touch-optimized tap targets (48px minimum)
- Portrait/landscape auto-adaptation
- Improved offline detection and sync status

Admin Dashboard Enhancements
- System Health Monitor with real-time metrics
- Advanced audit log filtering
- Bulk document management

Documentation & Learning
- Three certification courses (Fiber 101, 102, 103)
- Study guides with domain-specific practice questions
- Course progress tracking with resume capability
- Professional certificate generation

[FIXED] FIXES & STABILITY
- Fixed PDF symbol rendering (no more garbled special characters)
- Corrected PON PM report parsing for edge cases (< -40dBm readings)
- Improved error handling in document extraction
- Fixed date filtering in audit logs
- Better handling of large file uploads (>50MB)

SYSTEM REQUIREMENTS
- Browser: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Mobile: iOS 13+, Android 10+
- Internet: 5+ Mbps recommended
- Storage: ~50MB app, 100-500MB docs cache

THANK YOU FOR USING FIBERORACLE v2.1
For support, contact your administrator or visit the Help section.

END OF CHANGELOG
`;
    } else if (type === 'app_overview') {
      title = 'FiberOracle App Overview & Features';
      category = 'brochure';
      pdfContent = `
FIBERORACLE - APP OVERVIEW & FEATURES v2.1

Enterprise-Grade Progressive Web App (PWA) for Fiber Optic Professionals

What is FiberOracle?
FiberOracle is a complete technical toolkit designed for field technicians, engineers, and network administrators. It combines traditional technical tools with AI-powered diagnostics to streamline installation, troubleshooting, maintenance, and network analysis.

Key Positioning:
- Desktop: Full-featured web application for office work and detailed analysis
- Mobile/PWA: Installable offline-capable app for field technicians
- AI-First: Optional AI-centric mode for hands-free guidance
- Traditional: Classic modular interface for power users

Target Users:
- Field technicians (primary)
- Network engineers & administrators
- Training specialists & educators
- System operators & maintenance teams

CORE FEATURES

Fiber Optic Tools
- [YES] Loss Budget Calculator - Calculates power loss across fiber links
- [YES] Power Level Calculator - Predict ONT Rx power for GPON/XGS-PON
- [YES] OTDR Analysis - Visualizes optical traces to identify faults
- [YES] Optical Calculator - Quick dB, power, and wavelength conversions
- [YES] Splitter Loss Reference - Pre-calculated loss values
- [YES] Fiber Doctor AI - AI-assisted troubleshooting
- [YES] Bend Radius Guide - Safe bending limits for fiber types
- [YES] Fiber Locator - TIA-598 color coding for 12-3,456 fibers

Network & PON Monitoring
- [YES] PON PM Analysis - Parse and analyze ONT performance reports
- [YES] FEC Corrected Analysis - Identify ONTs with high corrected FEC near threshold
- [YES] Capacity Planning - Forecast splitter utilization with growth projections
- [YES] OLT Port Summary - Aggregate view of ports and channels
- [YES] Historical Trends - Charts with anomaly detection
- [YES] LCP Mapping - GPS-enabled map of fiber nodes
- [YES] LCP Directory - Searchable splitter locations with fiber counts

Documentation & Knowledge
- [YES] Reference Document Library - Central PDF/guide repository
- [YES] Advanced Search - Full-text search with fuzzy matching
- [YES] Document Submissions - User submissions with admin review
- [YES] Document Audit Trail - Complete change history

P.H.O.T.O.N. AI Agent
- [YES] Conversational AI - Technical support & diagnostics
- [YES] Multi-Modal Integration - Access to all company documentation
- [YES] Persistent Sessions - Resume conversations with full context
- [YES] Real-Time Web Search - Latest industry information

Field Operations
- [YES] Job Reports - Document work, measurements, photos
- [YES] AI Job Reports - Auto-generated from PON PM analysis with diagnosis
- [YES] Photo Capture - In-app camera with metadata
- [YES] GPS Location Tagging - Automatic geolocation
- [YES] Offline Work Mode - Full functionality without internet
- [YES] Auto-Sync - Data syncs when connection returns

Education & Certification
- [YES] Fiber 101/102/103 Courses - Structured training modules
- [YES] Certification Exams - Computer-based testing
- [YES] Study Guides - Domain-specific prep materials
- [YES] Progress Tracking - Resume and track completion

Admin & System
- [YES] Admin Control Panel - Centralized dashboard
- [YES] User Management - Invite users, assign roles
- [YES] Audit Logging - Complete action history
- [YES] System Health Monitor - Real-time metrics
- [YES] Bulk Operations - Manage documents efficiently

PWA & Offline
- [YES] Service Worker - Background sync & offline caching
- [YES] Install to Home Screen - App-like experience
- [YES] Offline Document Service - Access cached docs
- [YES] Local Data Persistence - IndexedDB storage

SYSTEM REQUIREMENTS

Web Browser (Desktop)
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

Mobile Devices
- iOS 13+ (iPhone, iPad)
- Android 10+ (smartphones, tablets)

Internet Connection
- Recommended: 5+ Mbps
- Minimum: 1+ Mbps
- Offline: All tools except P.H.O.T.O.N. chat available

Storage
- App: ~50 MB
- Cached docs: 100-500 MB
- Local reports: 5-20 MB per month

DOMAIN: https://www.fiberoracle.com
VERSION: 2.1
RELEASED: March 2026

END OF APP OVERVIEW
`;
    } else {
      return Response.json({ error: 'Unknown PDF type' }, { status: 400 });
    }

    // Generate actual PDF
    const pdfBytes = await generatePDF(title, pdfContent, type);
    
    // Convert to base64 for upload
    const base64Data = btoa(String.fromCharCode(...pdfBytes));
    const dataUrl = `data:application/pdf;base64,${base64Data}`;
    
    // Use fetch to convert to blob then upload
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    const file = new File([blob], `${type}.pdf`, { type: 'application/pdf' });

    // Upload PDF to storage
    const uploadResult = await base44.integrations.Core.UploadFile({ 
      file: file
    });

    // Create reference document record
    const doc = await base44.entities.ReferenceDocument.create({
      title,
      source_type: 'pdf',
      source_url: uploadResult.file_url,
      content: pdfContent.substring(0, 5000),
      category,
      metadata: {
        generated_date: new Date().toISOString(),
        generated_by: 'system',
        type,
        format: 'pdf',
        file_size: pdfBytes.length
      },
      version: '2.1',
      is_active: true,
      is_latest_version: true
    });

    // Log creation
    await base44.entities.AuditLog.create({
      event_type: 'document_reference',
      user_email: user.email || 'system',
      content: `Generated PDF documentation: ${title}`,
      metadata: {
        action: 'pdf_generated',
        document_id: doc.id,
        type,
        is_active: true
      },
      status: 'success'
    });

    return Response.json({
      success: true,
      document_id: doc.id,
      title,
      type,
      file_url: uploadResult.file_url,
      pdf_data: Array.from(pdfBytes),
      preview: pdfContent.substring(0, 200) + '...'
    });
  } catch (error) {
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});