import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, BookOpen, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function UserGuide() {
  const [expandedSections, setExpandedSections] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(null);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const generatePDF = async (type) => {
    setIsGenerating(type);
    try {
      const response = await base44.functions.invoke('generateDocumentationPDFs', {
        type
      });

      if (response.data.success) {
        toast.success(`${response.data.title} generated and saved to Offline Documents`);
      }
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
    setIsGenerating(null);
  };

  const pdfOptions = [
    {
      id: 'user_manual',
      label: 'User Manual v1.31.26',
      description: 'Complete guide covering all features, workflows, and best practices',
      icon: BookOpen
    },
    {
      id: 'quick_reference',
      label: 'Quick Reference Guide',
      description: 'Fast lookup for common tasks and tools',
      icon: Search
    },
    {
      id: 'changelog',
      label: 'v2.0.0 Changelog',
      description: 'New features, improvements, and fixes in latest release',
      icon: BookOpen
    },
    {
      id: 'app_overview',
      label: 'App Overview & Features',
      description: 'Complete feature list and system requirements',
      icon: BookOpen
    }
  ];

  const sections = [
    {
      id: 'getting_started',
      title: 'Getting Started',
      content: `
        <h3>First-Time Setup</h3>
        <p><strong>On Web (Desktop):</strong></p>
        <ol>
          <li>Navigate to https://www.fiberoracle.com</li>
          <li>Log in with your company email and password</li>
          <li>(Optional) Set your preference: Traditional Mode or AI-Centric Mode</li>
          <li>You're ready to go</li>
        </ol>
        
        <p><strong>On Mobile (iOS/Android):</strong></p>
        <ol>
          <li>Open a browser and go to https://www.fiberoracle.com</li>
          <li>Log in as above</li>
          <li>Look for "Install App" prompt</li>
          <li>Tap "Add to Home Screen" (or "Install" if using Chrome)</li>
          <li>FiberOracle now appears as an app icon on your home screen</li>
        </ol>

        <p><strong>Offline Access:</strong> FiberOracle works offline after your first visit. Your previously-accessed documents and tools remain available without internet. When connection returns, data automatically syncs.</p>

        <h3>Navigating FiberOracle</h3>
        <p><strong>Desktop Layout:</strong></p>
        <ul>
          <li>Top Header: Logo, navigation links, search, settings</li>
          <li>Left Sidebar (Optional): Quick access to major sections</li>
          <li>Main Content Area: Tool or page displayed</li>
          <li>Bottom Navigation: Secondary options</li>
        </ul>

        <p><strong>Mobile Layout:</strong></p>
        <ul>
          <li>Top Header: Logo, menu icon, title</li>
          <li>Main Content Area: Full screen for tool use</li>
          <li>Bottom Navigation Bar: Quick access to core tools</li>
        </ul>
      `
    },
    {
      id: 'core_tools',
      title: 'Core Tools Guide',
      content: `
        <h3>Loss Budget Calculator</h3>
        <p><strong>What It Does:</strong> Calculates total optical power loss from transmitter to receiver, accounting for cable attenuation, connector losses, splice losses, and splitter losses.</p>
        
        <p><strong>When to Use:</strong></p>
        <ul>
          <li>Before fiber installation (feasibility check)</li>
          <li>Verifying link design meets performance specs</li>
          <li>Troubleshooting power level problems</li>
        </ul>

        <p><strong>How to Use:</strong></p>
        <ol>
          <li>Open Loss Budget Calculator from Tools menu</li>
          <li>Enter cable length, number/type of connectors, splices, splitter configuration</li>
          <li>App displays total loss (dB), budget remaining, pass/fail status</li>
          <li>Adjust parameters to optimize design</li>
        </ol>

        <h3>Optical Calculator</h3>
        <p><strong>Quick conversions for:</strong></p>
        <ul>
          <li>dBm ↔ mW (power conversions)</li>
          <li>Decibels (dB, dBm, dBm/km)</li>
          <li>Distance-loss combinations</li>
          <li>Wavelength references</li>
        </ul>

        <p><strong>Example:</strong> If your power meter reads 0.5 mW, the calculator shows: -3.0 dBm</p>

        <h3>Other Core Tools</h3>
        <ul>
          <li><strong>OTDR Analysis:</strong> Visualizes optical traces to identify faults</li>
          <li><strong>Splitter Loss Reference:</strong> Pre-calculated values for common configurations</li>
          <li><strong>Fiber Doctor:</strong> AI-assisted troubleshooting for common issues</li>
          <li><strong>Bend Radius Guide:</strong> Safe bending limits for different fiber types</li>
        </ul>
      `
    },
    {
      id: 'field_work',
      title: 'Field Work & Reporting',
      content: `
        <h3>Creating a Job Report</h3>
        <p><strong>Why Report?</strong> Job reports create professional records of work completed, evidence of performance, and compliance documentation.</p>

        <p><strong>What to Include:</strong></p>
        <ul>
          <li>Job number / work order reference</li>
          <li>Your name and company</li>
          <li>Date and time</li>
          <li>Site location and GPS coordinates (auto-captured)</li>
          <li>Work completed (description)</li>
          <li>Measurements (before/after power levels, OTDR, etc.)</li>
          <li>Photos (connectors, splices, cable routing)</li>
          <li>Any issues encountered</li>
          <li>Sign-off approval</li>
        </ul>

        <p><strong>How to Create:</strong></p>
        <ol>
          <li>Open Field Mode from home page</li>
          <li>Tap New Job Report</li>
          <li>Fill in basic info (auto-populated: date, your name, location)</li>
          <li>Select report type (Loss Budget, OTDR, Inspection, etc.)</li>
          <li>Enter measurements and tap camera icon to add photos</li>
          <li>Tap Save (offline) or Submit (online)</li>
        </ol>

        <h3>Photo Capture Integration</h3>
        <p><strong>Built-In Camera:</strong></p>
        <ol>
          <li>Within a Job Report, tap 📸 Add Photo</li>
          <li>Camera opens directly in app</li>
          <li>Take photo (auto-includes metadata: time, GPS, job ID)</li>
          <li>Tap ✓ to save to report</li>
        </ol>
        <p>Photos are tied directly to your measurements and site location—creating a complete record without separate file management.</p>

        <h3>GPS Location Tagging</h3>
        <p><strong>Automatic Capture:</strong> When you create a job report, FiberOracle requests GPS permission. Location automatically recorded and embedded in all photos/measurements.</p>
        <p><strong>Manual Override:</strong> If GPS is inaccurate, tap Edit Location to manually set coordinates.</p>
      `
    },
    {
      id: 'photon_ai',
      title: 'P.H.O.T.O.N. AI Agent',
      content: `
        <h3>What Is P.H.O.T.O.N.?</h3>
        <p>P.H.O.T.O.N. (Portable Hosting Optical Testing Operations Nexus) is your AI-powered technical expert. It's a conversational agent trained on your company's complete knowledge base, industry standards, and proven troubleshooting methods.</p>

        <h3>How to Access</h3>
        <ul>
          <li><strong>Desktop:</strong> Click P.H.O.T.O.N. Chat from main menu</li>
          <li><strong>Mobile (Traditional Mode):</strong> Tap Chat in bottom navigation</li>
          <li><strong>Mobile (AI-Centric Mode):</strong> AI chat appears on every page</li>
        </ul>

        <h3>How to Use P.H.O.T.O.N.</h3>
        <p><strong>Starting a Conversation:</strong></p>
        <ol>
          <li>Open P.H.O.T.O.N. Chat page</li>
          <li>Type your question or describe your problem</li>
          <li>Examples:
            <ul>
              <li>"How do I splice this 144-fiber cable?"</li>
              <li>"This ONT shows -38 dBm Rx power—is it at risk?"</li>
              <li>"What's the loss budget for a 5km run with 3 splices?"</li>
            </ul>
          </li>
        </ol>

        <p><strong>Getting Better Answers:</strong></p>
        <ul>
          <li>Be specific: "Connector loss for standard UPC connector" vs. "connector loss"</li>
          <li>Provide context: Include what you've already tried, measurements, equipment type</li>
          <li>Ask follow-ups: P.H.O.T.O.N. remembers conversation history</li>
        </ul>

        <h3>What P.H.O.T.O.N. Can Help With</h3>
        <ul>
          <li>✅ Technical Calculations (power budgets, dB conversions, loss estimates)</li>
          <li>✅ Troubleshooting Guidance (diagnostic procedures, root cause analysis)</li>
          <li>✅ Installation Procedures (best practices, safety procedures, equipment specs)</li>
          <li>✅ Documentation Lookup (find references in your knowledge base)</li>
          <li>✅ Network Analysis (interpret ONT performance data, identify trends)</li>
          <li>❌ Cannot Help With: Replacing your judgment on critical infrastructure decisions</li>
        </ul>

        <p><strong>Important:</strong> Always verify critical information with your supervisor or company standards before acting on it.</p>
      `
    },
    {
      id: 'documentation',
      title: 'Documentation & Learning',
      content: `
        <h3>Accessing the Reference Library</h3>
        <p><strong>On Any Page:</strong> Use the Search function in the top header to search by keyword, document title, or topic. Results show matching documents with snippets.</p>
        
        <p><strong>From Home:</strong> Click Documentation or Reference Library to browse by category (Installation, Troubleshooting, Maintenance, Safety, Standards, Training, Other).</p>

        <h3>Fiber 101/102/103 Courses</h3>
        <p><strong>Purpose:</strong> Structured training to build fiber optic expertise.</p>

        <p><strong>Each course includes:</strong></p>
        <ul>
          <li>10-15 learning modules</li>
          <li>Embedded calculations and reference tables</li>
          <li>Practice questions with explanations</li>
          <li>Final certification exam</li>
        </ul>

        <p><strong>How to Complete:</strong></p>
        <ol>
          <li>Click Education or Learning from home menu</li>
          <li>Select course: Fiber 101, 102, or 103</li>
          <li>Start with Module 1 (or resume where you left off)</li>
          <li>Read content, try calculations, answer practice questions</li>
          <li>Take final exam when ready</li>
          <li>Must score ≥80% to pass and receive certificate</li>
        </ol>

        <h3>Submitting Documents</h3>
        <p><strong>Share Knowledge:</strong> Found a useful document, procedure, or reference? Submit it!</p>

        <p><strong>How to Submit:</strong></p>
        <ol>
          <li>Click Submit Document</li>
          <li>Choose source: Upload PDF/file, Link Google Drive, or Paste web URL</li>
          <li>Fill in: Title, Category, Brief description, Comments</li>
          <li>Check "Request Addition to Master List" if appropriate</li>
          <li>Submit</li>
          <li>Admin reviews within 1-2 business days</li>
        </ol>
      `
    },
    {
      id: 'mobile_tips',
      title: 'Mobile-Specific Tips',
      content: `
        <h3>Best Practices for Fieldwork</h3>
        <p><strong>Before You Head Out:</strong></p>
        <ul>
          <li>Sync all data (in Settings, tap Force Sync)</li>
          <li>Enable WiFi while syncing (faster than cellular)</li>
          <li>Plug in phone if working near power</li>
        </ul>

        <p><strong>In the Field:</strong></p>
        <ul>
          <li>Use Dark Mode (default)—easier to read in sunlight</li>
          <li>Keep phone in landscape orientation for larger buttons</li>
          <li>Use voice input (speech-to-text) for fast report entry</li>
          <li>Tap the camera icon frequently—photos are worth 1000 words</li>
        </ul>

        <p><strong>Back at the Office:</strong></p>
        <ul>
          <li>Review your reports before submission</li>
          <li>Add any notes or context you remember</li>
          <li>Create templates from recurring job types</li>
        </ul>

        <h3>Offline-First Workflow</h3>
        <p><strong>Scenario: You're installing fiber 5km from nearest cell tower</strong></p>

        <p><strong>Before losing signal:</strong> Sync all data</p>

        <p><strong>In field (no signal):</strong></p>
        <ul>
          <li>Create job reports normally</li>
          <li>Take photos (stored locally with metadata)</li>
          <li>Use Loss Budget and Optical Calculator (all local)</li>
          <li>Cannot use P.H.O.T.O.N. chat (needs internet)</li>
          <li>Reports show "📍 Offline" badge</li>
        </ul>

        <p><strong>When back in range:</strong></p>
        <ul>
          <li>Status bar shows syncing progress</li>
          <li>Tap Sync Now if it doesn't auto-start</li>
          <li>Reports change from "📍 Offline" to "✓ Synced"</li>
        </ul>

        <h3>Reducing Data Usage</h3>
        <ul>
          <li><strong>Downloads:</strong> Reference docs cached after first view (no re-download)</li>
          <li><strong>Photos:</strong> App compresses photos to ~1-2MB each</li>
          <li><strong>Sync Frequency:</strong> Auto-sync occurs every 5 minutes (adjustable in Settings)</li>
        </ul>
      `
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      content: `
        <h3>Common Issues & Solutions</h3>

        <p><strong>App won't sync</strong></p>
        <ul>
          <li>Check internet connection</li>
          <li>Go to Settings → Force Sync</li>
          <li>If still stuck, restart the app</li>
        </ul>

        <p><strong>Photos not saving</strong></p>
        <ul>
          <li>Ensure sufficient storage (check device storage)</li>
          <li>Grant app permission to access camera & photos</li>
        </ul>

        <p><strong>P.H.O.T.O.N. not responding</strong></p>
        <ul>
          <li>Refresh browser or restart app</li>
          <li>Check internet connection</li>
          <li>If still stuck, start a new conversation</li>
        </ul>

        <p><strong>Job report seems incomplete</strong></p>
        <ul>
          <li>Check offline status (look for 📍 icon)</li>
          <li>Ensure all required fields are filled (highlighted in red)</li>
        </ul>

        <p><strong>Settings not saving</strong></p>
        <ul>
          <li>Ensure you tapped the "Save" button, not just the back arrow</li>
          <li>Retry</li>
        </ul>

        <p><strong>Can't find a document</strong></p>
        <ul>
          <li>Use the Search bar (top right)</li>
          <li>Check spelling and try related keywords</li>
          <li>Ask P.H.O.T.O.N. where to find it</li>
        </ul>

        <p><strong>GPS location inaccurate</strong></p>
        <ul>
          <li>Try again outdoors with clear sky view</li>
          <li>Alternatively, manually enter coordinates</li>
        </ul>
      `
    },
    {
      id: 'best_practices',
      title: 'Best Practices',
      content: `
        <h3>Do's ✅</h3>
        <ul>
          <li>Create detailed job reports with photos</li>
          <li>Use P.H.O.T.O.N. for guidance before attempting unfamiliar tasks</li>
          <li>Verify critical calculations a second time</li>
          <li>Sync data regularly (especially end-of-day)</li>
          <li>Review reference docs for complex procedures</li>
          <li>Submit useful documents you discover</li>
        </ul>

        <h3>Don'ts ❌</h3>
        <ul>
          <li>Don't rely solely on P.H.O.T.O.N. for critical safety decisions</li>
          <li>Don't take photos of network architecture or sensitive equipment (if restricted)</li>
          <li>Don't forget to GPS-tag your locations (helps accountability)</li>
          <li>Don't delete conversations prematurely (audit trail may be needed)</li>
          <li>Don't use outdated documents from reference library (check version date)</li>
        </ul>
      `
    }
  ];

  const filteredSections = searchTerm 
    ? sections.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.content.toLowerCase().includes(searchTerm.toLowerCase()))
    : sections;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">User Guide</h1>
                <p className="text-sm text-slate-400">Complete documentation and tutorials</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Download PDFs Section */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-400" />
              Download Documentation as PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pdfOptions.map(pdf => (
                <div key={pdf.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                  <p className="font-medium text-white mb-1">{pdf.label}</p>
                  <p className="text-sm text-slate-300 mb-3">{pdf.description}</p>
                  <Button
                    size="sm"
                    onClick={() => generatePDF(pdf.id)}
                    disabled={isGenerating === pdf.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isGenerating === pdf.id ? (
                      <>Loading...</>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Generate PDF
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search help topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Expandable Sections */}
        <div className="space-y-3">
          {filteredSections.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6 text-center text-slate-400">
                No topics found matching your search.
              </CardContent>
            </Card>
          ) : (
            filteredSections.map(section => (
              <Card key={section.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">{section.title}</CardTitle>
                    {expandedSections[section.id] ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </CardHeader>
                {expandedSections[section.id] && (
                  <CardContent className="text-slate-200">
                    <div 
                      className="prose prose-invert max-w-none space-y-4 text-sm"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>

        {/* FAQ Section */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <details className="group">
              <summary className="cursor-pointer font-medium text-white">Can I use FiberOracle without an internet connection?</summary>
              <p className="mt-2 text-slate-300">Yes. Core tools (Loss Budget, Optical Calculator) work fully offline. Reference docs are accessible if viewed before losing connection. Job reports sync when you're back online. P.H.O.T.O.N. chat requires internet.</p>
            </details>

            <details className="group">
              <summary className="cursor-pointer font-medium text-white">How do I add my company's procedures to FiberOracle?</summary>
              <p className="mt-2 text-slate-300">Use the Document Submission feature. Upload PDFs, procedures, or guides. Admin reviews and approves additions to the company knowledge base.</p>
            </details>

            <details className="group">
              <summary className="cursor-pointer font-medium text-white">Can I access FiberOracle on multiple devices?</summary>
              <p className="mt-2 text-slate-300">Yes. Log in on any device. Your preferences and past conversations sync across devices. Job reports created on one device appear on all devices.</p>
            </details>

            <details className="group">
              <summary className="cursor-pointer font-medium text-white">What should I do if P.H.O.T.O.N. gives me incorrect information?</summary>
              <p className="mt-2 text-slate-300">P.H.O.T.O.N. can make mistakes. Always verify critical information with your supervisor or company standards before acting on it. Report issues to your admin.</p>
            </details>

            <details className="group">
              <summary className="cursor-pointer font-medium text-white">Can I export my job reports?</summary>
              <p className="mt-2 text-slate-300">Yes. From Settings, select Download My Data. All reports export as a PDF package you can archive or share.</p>
            </details>
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border-slate-700">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-2">Need Help?</h3>
            <p className="text-slate-300 mb-4">If you can't find the answer you're looking for:</p>
            <div className="space-y-2">
              <p className="text-slate-300">1. <strong>Ask P.H.O.T.O.N.:</strong> Open P.H.O.T.O.N. Chat and ask your question directly</p>
              <p className="text-slate-300">2. <strong>Contact Support:</strong> Reach out to your administrator or support team</p>
              <p className="text-slate-300">3. <strong>Report Issues:</strong> Go to Settings → Report Issue with details</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}