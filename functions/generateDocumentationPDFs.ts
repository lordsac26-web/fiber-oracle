import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';
import Handlebars from 'npm:handlebars@4.7.8';

// Professional HTML template for PDFs
function getTemplate(type) {
  const baseTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      margin: 0;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      color: #1a1a1a;
      line-height: 1.6;
    }
    .page {
      position: relative;
      padding: 60px 50px 80px 50px;
      min-height: 100vh;
    }
    .header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      padding: 0 50px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header .logo {
      font-size: 24px;
      font-weight: bold;
      color: white;
      letter-spacing: 1px;
    }
    .header .doc-type {
      margin-left: auto;
      color: rgba(255,255,255,0.9);
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: #f8f9fa;
      border-top: 2px solid #667eea;
      display: flex;
      align-items: center;
      padding: 0 50px;
      font-size: 12px;
      color: #6c757d;
    }
    .footer .page-number {
      margin-left: auto;
    }
    h1 {
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
      margin: 30px 0 20px 0;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    h2 {
      font-size: 24px;
      font-weight: 600;
      color: #764ba2;
      margin: 25px 0 15px 0;
      padding-left: 15px;
      border-left: 4px solid #667eea;
    }
    h3 {
      font-size: 18px;
      font-weight: 600;
      color: #495057;
      margin: 20px 0 10px 0;
    }
    p {
      margin: 10px 0;
      text-align: justify;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .subsection {
      margin-left: 20px;
      margin-bottom: 20px;
    }
    ul, ol {
      margin: 10px 0;
      padding-left: 30px;
    }
    li {
      margin: 5px 0;
    }
    .highlight-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px 20px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .note {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px 20px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .warning {
      background: #f8d7da;
      border-left: 4px solid #dc3545;
      padding: 15px 20px;
      margin: 15px 0;
      border-radius: 4px;
    }
    code {
      background: #e9ecef;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      padding: 50px;
    }
    .cover-page h1 {
      font-size: 48px;
      color: white;
      border: none;
      margin-bottom: 20px;
    }
    .cover-page .subtitle {
      font-size: 24px;
      opacity: 0.9;
      margin-bottom: 40px;
    }
    .cover-page .meta {
      font-size: 16px;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">FIBERORACLE</div>
    <div class="doc-type">{{documentType}}</div>
  </div>
  
  <div class="page">
    {{{content}}}
  </div>
  
  <div class="footer">
    <span>© 2026 FiberOracle | Confidential & Proprietary</span>
    <span class="page-number">Version {{version}}</span>
  </div>
</body>
</html>
  `;

  return baseTemplate;
}

// Convert content to formatted HTML sections
function formatContentToHTML(content, type) {
  const lines = content.trim().split('\n');
  let html = '';
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      continue;
    }

    // Main title (all caps, long)
    if (line === line.toUpperCase() && line.length > 20 && !line.startsWith('✅') && !line.startsWith('❌')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h1>${line}</h1>`;
    }
    // Section headers (SECTION X:)
    else if (line.match(/^SECTION \d+:/)) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<div class="section"><h2>${line}</h2>`;
    }
    // Subsection headers (numbered like 2.1)
    else if (line.match(/^\d+\.\d+\s+[A-Z]/)) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h3>${line}</h3>`;
    }
    // Question format
    else if (line.startsWith('Q:')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<div class="highlight-box"><strong>${line}</strong></div>`;
    }
    // Answer format
    else if (line.startsWith('A:')) {
      html += `<p>${line.substring(2).trim()}</p>`;
    }
    // List items with ✅ or ❌
    else if (line.startsWith('✅') || line.startsWith('❌')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${line}</li>`;
    }
    // Bullet points with - or •
    else if (line.startsWith('-') || line.startsWith('•')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${line.substring(1).trim()}</li>`;
    }
    // Numbered lists
    else if (line.match(/^\d+\.\s/)) {
      html += `<p>${line}</p>`;
    }
    // Warning/Note format
    else if (line.includes('IMPORTANT:') || line.includes('CRITICAL:') || line.includes('NOTE:')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<div class="warning">${line}</div>`;
    }
    // Regular paragraph
    else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<p>${line}</p>`;
    }
  }

  if (inList) {
    html += '</ul>';
  }

  return html;
}

async function generatePDF(title, content, type, version = '2.0') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  // Prepare template data
  const htmlContent = formatContentToHTML(content, type);
  const template = Handlebars.compile(getTemplate(type));
  const html = template({
    title,
    content: htmlContent,
    documentType: type.toUpperCase().replace(/_/g, ' '),
    version,
    date: new Date().toLocaleDateString()
  });

  // Use jsPDF's html method to render the HTML
  await doc.html(html, {
    callback: function(doc) {
      // PDF generation complete
    },
    x: 0,
    y: 0,
    width: 595.28, // A4 width in points
    windowWidth: 800,
    margin: [0, 0, 0, 0]
  });

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
      title = 'FiberOracle User Manual v1.31.26';
      category = 'training';
      pdfContent = `
FIBERORACLE USER MANUAL v1.31.26

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
How to Use: Open Loss Budget Calculator → Enter cable length, connectors, splices → App displays total loss & budget.

3.2 Optical Calculator
Quick conversions: dBm ↔ mW, decibels, distance-loss combinations, wavelength references.

SECTION 4: FIELD WORK & REPORTING

4.1 Creating a Job Report
Why Report: Creates professional record of work, evidence of performance, compliance documentation.
What to Include: Job number, your name, date/time, location, work completed, measurements, photos, issues.

4.2 Photo Capture Integration
Within a Job Report: Tap 📸 Add Photo → Camera opens → Take photo → Tap ✓ to save.
Why This Matters: Photos tied to measurements and site location, creating complete record without separate file management.

4.3 GPS Location Tagging
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
✅ Technical Calculations (power budgets, dB conversions, loss estimates)
✅ Troubleshooting Guidance (diagnostic procedures, root cause analysis)
✅ Installation Procedures (best practices, safety procedures, equipment specs)
✅ Documentation Lookup (find references in knowledge base)
✅ Network Analysis (interpret ONT performance data, identify trends)

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

SECTION 8: MOBILE-SPECIFIC TIPS

8.1 Best Practices for Fieldwork
Before: Sync all data, enable WiFi, plug in phone
In Field: Use Dark Mode, landscape orientation, voice input
After: Review reports, add notes, create templates

8.2 Offline-First Workflow
Before losing signal: Sync all data
In field: Create reports, take photos, use calculators (no P.H.O.T.O.N.)
When back in range: Tap Sync Now, reports auto-upload

8.3 Reducing Data Usage
Reference docs cached after first view, photos compressed to 1-2MB, auto-sync every 5 minutes.

SECTION 9: COMMON QUESTIONS & TROUBLESHOOTING

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

SECTION 10: BEST PRACTICES

✅ DO:
- Create detailed job reports with photos
- Use P.H.O.T.O.N. for guidance before unfamiliar tasks
- Verify critical calculations twice
- Sync data regularly (especially end-of-day)
- Review reference docs for complex procedures
- Submit useful documents you discover

❌ DON'T:
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
      title = 'FiberOracle v2.0.0 Changelog - January 31, 2026';
      category = 'other';
      pdfContent = `
FIBERORACLE v2.0.0 CHANGELOG
"P.H.O.T.O.N. AI Integration & Premium UX"
Released: January 31, 2026

✨ NEW FEATURES

🤖 P.H.O.T.O.N. AI Agent Integration
- Enterprise AI assistant for fiber optic technicians
- Multi-turn conversations with persistent session history
- Full access to company knowledge base and documentation
- Real-time web search for current technical information
- AI-assisted diagnostics with step-by-step guidance
- Voice-friendly: Works great with mobile speech-to-text

AI-Centric Mode
- New UI layout optimized for AI-first workflows
- Quick-access sidebar with categorized technical tools
- Seamless switching between AI chat and reference tools
- Keyboard shortcuts (Cmd+N for new chat, Cmd+K to focus input)

Enhanced Reference Documentation System
- Full-text search with fuzzy matching
- User submissions with admin review workflow
- Document versioning and audit trail
- Security scanning for submitted documents
- Active/inactive status toggle for smart knowledge base management

Conversation Management (Admin)
- View and delete conversations for compliance
- Filter by date range, message count, or keywords
- Bulk deletion capabilities

🚀 IMPROVEMENTS

User Interface Overhaul
- New premium button styles with glow effects
- Smooth animations across all transitions
- Enhanced modal dialogs with backdrop blur
- Improved dark theme with better contrast ratios
- Responsive layout improvements for small screens

Performance & Reliability
- Optimized bundle size (18% reduction)
- Faster initial page load (2.1s → 1.4s on 3G)
- Improved service worker caching strategy
- Better error boundaries with graceful fallbacks

Mobile Experience
- Bottom navigation bar for quick tool access
- Touch-optimized tap targets (48px minimum)
- Portrait/landscape auto-adaptation
- Improved offline detection and sync status
- Native camera integration for photo capture

Admin Dashboard Enhancements
- System Health Monitor with real-time metrics
- Advanced audit log filtering with date ranges and event types
- Bulk document management (activate, deactivate, delete)
- Quick approval/denial of master list submissions
- Admin onboarding tour for new administrators

Documentation & Learning
- Three new certification courses (Fiber 101, 102, 103)
- Study guides with domain-specific practice questions
- Course progress tracking with resume capability
- Professional certificate generation

🛠 FIXES & STABILITY UPDATES
- Fixed reactflow import errors in NetworkDiagram
- Resolved photo upload failure in offline mode
- Corrected PON PM report parsing for edge cases (< -40dBm readings)
- Fixed conversation list pagination on mobile
- Improved error handling in document extraction
- Better handling of large file uploads (>50MB)
- Fixed date filtering in audit logs

🔐 Security & Compliance
- DOMPurify integration for XSS protection
- Enhanced audit logging for all admin actions
- User submission review workflow with security scanning
- API rate limiting on document uploads
- Improved session timeout handling

🐛 Bug Fixes
- Message bubbles no longer duplicate on rapid send
- Fixed state management in AdminPanel tabs
- Resolved timezone issues in date range filters
- Corrected ONT performance calculations (BIP error aggregation)
- Fixed GPS location persistence in job reports

🤖 AI AGENT INTEGRATION HIGHLIGHT

What is P.H.O.T.O.N.?
P.H.O.T.O.N. (Portable Hosting Optical Testing Operations Nexus) is your AI-powered technical expert trained on your company's complete knowledge base, industry standards, and proven troubleshooting methods.

How Users Interact
- Primary Interface: Dedicated P.H.O.T.O.N. Chat page or AI-Centric Mode
- Start conversation → Ask questions/problems → P.H.O.T.O.N. asks clarifying questions → Get guidance
- Mobile-friendly for landscape field work with degraded offline capabilities

Problems Solved
- "What's max loss budget?" → Instant calculation with explanation
- "ONT showing -35dBm?" → Contextual guidance with thresholds and actions
- "How to clean ribbon cable?" → Step-by-step procedure from standards
- "Why splice showing 0.8dB loss?" → Diagnostic questions and fix recommendations
- "MPO connector procedure?" → Reference plus safety warnings

Competitive Advantage
- Speed: Seconds instead of minutes-to-hours
- Consistency: Same guidance following best practices
- Scalability: Train teams without proportionally increasing expert time
- Quality: Reduces trial-and-error, diagnoses faster
- Confidence: Newer staff feel supported

SYSTEM REQUIREMENTS
- Browser: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Mobile: iOS 13+, Android 10+
- Internet: 5+ Mbps recommended
- Storage: ~50MB app, 100-500MB docs cache

THANK YOU FOR USING FIBERORACLE v2.0.0
For support, contact your administrator or visit the Help section.

END OF CHANGELOG
`;
    } else if (type === 'app_overview') {
      title = 'FiberOracle App Overview & Features';
      category = 'brochure';
      pdfContent = `
FIBERORACLE - APP OVERVIEW & FEATURES

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
✅ Loss Budget Calculator - Calculates power loss across fiber links
✅ OTDR Analysis - Visualizes optical traces to identify faults
✅ Optical Calculator - Quick dB, power, and wavelength conversions
✅ Splitter Loss Reference - Pre-calculated loss values
✅ Fiber Doctor AI - AI-assisted troubleshooting
✅ Bend Radius Guide - Safe bending limits for fiber types

Network & PON Monitoring
✅ PON PM Analysis - Parse and analyze performance reports
✅ ONT Performance Tracking - Real-time monitoring dashboard
✅ OLT Port Summary - Aggregate view of ports and channels
✅ Historical Trends - Charts with anomaly detection
✅ LCP Mapping - GPS-enabled map of fiber nodes
✅ LCP Directory - Searchable splitter locations

Documentation & Knowledge
✅ Reference Document Library - Central PDF/guide repository
✅ Advanced Search - Full-text search with fuzzy matching
✅ Document Submissions - User submissions with admin review
✅ Document Audit Trail - Complete change history

P.H.O.T.O.N. AI Agent
✅ Conversational AI - Technical support & diagnostics
✅ Multi-Modal Integration - Access to all company documentation
✅ Persistent Sessions - Resume conversations with full context
✅ Real-Time Web Search - Latest industry information

Field Operations
✅ Job Reports - Document work, measurements, photos
✅ Photo Capture - In-app camera with metadata
✅ GPS Location Tagging - Automatic geolocation
✅ Offline Work Mode - Full functionality without internet
✅ Auto-Sync - Data syncs when connection returns

Education & Certification
✅ Fiber 101/102/103 Courses - Structured training modules
✅ Certification Exams - Computer-based testing
✅ Study Guides - Domain-specific prep materials
✅ Progress Tracking - Resume and track completion

Admin & System
✅ Admin Control Panel - Centralized dashboard
✅ User Management - Invite users, assign roles
✅ Audit Logging - Complete action history
✅ System Health Monitor - Real-time metrics
✅ Bulk Operations - Manage documents efficiently

PWA & Offline
✅ Service Worker - Background sync & offline caching
✅ Install to Home Screen - App-like experience
✅ Offline Document Service - Access cached docs
✅ Local Data Persistence - IndexedDB storage

Mobile Features
✅ Touch-Optimized UI - Large tap targets for gloved operation
✅ Bottom Navigation - Quick tool access
✅ Auto-Adapt - Portrait/landscape orientation support
✅ Native Camera - Direct photo capture
✅ Dark Mode Default - Outdoor visibility
✅ Geolocation - Automatic GPS recording

Premium UX
✅ AI-Centric Mode - AI-first interface option
✅ Animated Transitions - Smooth page animations
✅ Premium Buttons - Glowing interactive effects
✅ Real-Time Loading States - Clear feedback
✅ Dark Theme - Eye-friendly modern aesthetic
✅ Accessibility - WCAG AA compliant

SYSTEM REQUIREMENTS

Web Browser (Desktop)
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

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

ACCESSIBILITY
✅ High-contrast dark theme (WCAG AA compliant)
✅ Large touch targets (48px minimum)
✅ Keyboard navigation
✅ Screen reader support
✅ Focus indicators
✅ Descriptive error messages

DOMAIN: https://www.fiberoracle.com
VERSION: 2.0.0
RELEASED: January 31, 2026

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
      version: '2.0',
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