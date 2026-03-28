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
      label: 'User Manual v2.1',
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
      label: 'v2.1 Changelog',
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
        <p><strong>When to Use:</strong> Before fiber installation, verifying link design meets performance specs, troubleshooting power level problems.</p>

        <h3>Optical Calculator</h3>
        <p>Quick conversions for dBm to mW, decibels, distance-loss combinations, and wavelength references.</p>

        <h3>Other Core Tools</h3>
        <ul>
          <li><strong>OTDR Analysis:</strong> Visualizes optical traces to identify faults</li>
          <li><strong>Splitter Loss Reference:</strong> Pre-calculated values for common configurations</li>
          <li><strong>Fiber Doctor:</strong> AI-assisted troubleshooting for common issues</li>
          <li><strong>Bend Radius Guide:</strong> Safe bending limits for different fiber types</li>
          <li><strong>Fiber Locator:</strong> TIA-598 color coding for up to 3,456 fibers</li>
          <li><strong>Power Level Calculator:</strong> Predict ONT Rx power for GPON and XGS-PON</li>
        </ul>
      `
    },
    {
      id: 'pon_pm',
      title: 'PON PM Analysis & Network Monitoring',
      content: `
        <h3>PON PM Analysis</h3>
        <p><strong>What It Does:</strong> Parses CSV exports from your OLT's performance monitoring system and presents a comprehensive analysis of every ONT on the network.</p>

        <p><strong>Key Features:</strong></p>
        <ul>
          <li><strong>Automated Health Classification:</strong> Each ONT is classified as Critical, Warning, OK, or Offline based on configurable thresholds</li>
          <li><strong>OLT/Port Hierarchy View:</strong> Drill down from OLT to port to individual ONT</li>
          <li><strong>OLT/Port Summary View:</strong> Aggregate health and error statistics at a glance</li>
          <li><strong>LCP Summary:</strong> See utilization and health by LCP location with map integration</li>
          <li><strong>FEC Corrected Analysis:</strong> Identifies ONTs with high corrected FEC counts that may appear "OK" but are operating near error-correction thresholds, risking micro-drops and buffering</li>
          <li><strong>Historical Trends:</strong> Compare reports over time to spot degradation patterns</li>
          <li><strong>Power Distribution Charts:</strong> Visualize ONT Rx and OLT Rx distributions</li>
          <li><strong>KPI Dashboard:</strong> Signal strength averages, error rates, technology breakdown</li>
        </ul>

        <h3>How to Use</h3>
        <ol>
          <li>Navigate to PON PM Analysis from the home page</li>
          <li>Upload a CSV export from your OLT or load a previously saved report</li>
          <li>Review the summary cards (Total, Critical, Warnings, Offline, Healthy, OLTs)</li>
          <li>Use filters to narrow by status, OLT, port, technology, or power range</li>
          <li>Switch between Summary, Hierarchy, and FEC Corrected views</li>
          <li>Click Details on any ONT for full performance history and peer comparison</li>
          <li>Use Export to generate CSV, PDF, or text reports</li>
        </ol>

        <h3>Corrected FEC Analysis</h3>
        <p>ONTs with non-zero corrected FEC codewords may appear "OK" but are actively error-correcting. High corrected FEC counts indicate the link is operating near its correction threshold and may soon become uncorrectable. The FEC Corrected view categorizes ONTs into:</p>
        <ul>
          <li><strong>High (10,000+):</strong> Likely causing subscriber-impacting micro-drops</li>
          <li><strong>Moderate (1,000-9,999):</strong> Approaching concerning levels</li>
          <li><strong>Low (1-999):</strong> Non-zero but within acceptable range</li>
        </ul>

        <h3>Capacity Planning</h3>
        <p>The Capacity Planning dashboard analyzes PON PM reports over time to forecast splitter utilization and identify LCPs approaching capacity limits. It calculates growth rates using linear regression and flags splitters that may reach 90%+ utilization.</p>

        <h3>LCP Database & Map</h3>
        <p>Manage your LCP/CLCP inventory with GPS coordinates, splitter ratios, OLT port assignments, optic details, and fiber counts. The interactive map view shows all LCP locations with health status overlays from your latest PON PM report.</p>
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
        </ul>

        <h3>AI-Generated Job Reports</h3>
        <p>From the PON PM Analysis page, click the <strong>Job</strong> button on any ONT to auto-generate a pre-filled job report with AI-powered diagnosis, recommended actions, equipment list, and historical performance trends.</p>

        <h3>Photo Capture &amp; GPS</h3>
        <p>Within a Job Report, tap Add Photo to open the camera. Photos automatically include metadata (time, GPS, job ID) and are tied directly to your measurements and site location.</p>
      `
    },
    {
      id: 'photon_ai',
      title: 'P.H.O.T.O.N. AI Agent',
      content: `
        <h3>What Is P.H.O.T.O.N.?</h3>
        <p>P.H.O.T.O.N. (Portable Hosting Optical Testing Operations Nexus) is your AI-powered technical expert. It is a conversational agent trained on your company's complete knowledge base, industry standards, and proven troubleshooting methods.</p>

        <h3>How to Access</h3>
        <ul>
          <li><strong>Desktop:</strong> Click P.H.O.T.O.N. Chat from main menu</li>
          <li><strong>Mobile (Traditional Mode):</strong> Tap Chat in bottom navigation</li>
          <li><strong>Mobile (AI-Centric Mode):</strong> AI chat appears on every page</li>
        </ul>

        <h3>What P.H.O.T.O.N. Can Help With</h3>
        <ul>
          <li>Technical Calculations (power budgets, dB conversions, loss estimates)</li>
          <li>Troubleshooting Guidance (diagnostic procedures, root cause analysis)</li>
          <li>Installation Procedures (best practices, safety procedures, equipment specs)</li>
          <li>Documentation Lookup (find references in your knowledge base)</li>
          <li>Network Analysis (interpret ONT performance data, identify trends)</li>
        </ul>

        <p><strong>Important:</strong> Always verify critical information with your supervisor or company standards before acting on it.</p>
      `
    },
    {
      id: 'documentation',
      title: 'Documentation & Learning',
      content: `
        <h3>Reference Library</h3>
        <p>Use the Search function to search by keyword, document title, or topic. Browse by category from the home page. Categories include Installation, Troubleshooting, Maintenance, Safety, Specifications, Training, and custom categories.</p>

        <h3>Fiber 101/102/103 Courses</h3>
        <p>Structured training with 10-15 modules per course, embedded calculations, practice questions, and a final certification exam. Score 80% or higher to pass and receive a professional certificate.</p>

        <h3>Submitting Documents</h3>
        <p>Upload PDFs, link Google Drive files, or paste web URLs. Add title, category, and description. Check "Request Addition to Master List" if appropriate. Admin reviews submissions within 1-2 business days.</p>
      `
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      content: `
        <h3>Common Issues &amp; Solutions</h3>

        <p><strong>App won't sync:</strong> Check internet connection, go to Settings and Force Sync, or restart the app.</p>
        <p><strong>Photos not saving:</strong> Ensure sufficient storage and grant app permission to access camera and photos.</p>
        <p><strong>P.H.O.T.O.N. not responding:</strong> Refresh browser, restart app, or check internet connection. Start a new conversation if needed.</p>
        <p><strong>PON PM upload failing:</strong> Ensure the file is a valid CSV export from your OLT system. Check that file size is under 50MB.</p>
        <p><strong>GPS location inaccurate:</strong> Try outdoors with clear sky view, or manually enter coordinates.</p>
        <p><strong>PDF export has garbled characters:</strong> This should not happen with the latest version. If you see unreadable characters, contact your admin.</p>
      `
    },
    {
      id: 'best_practices',
      title: 'Best Practices',
      content: `
        <h3>Recommended</h3>
        <ul>
          <li>Create detailed job reports with photos</li>
          <li>Use P.H.O.T.O.N. for guidance before attempting unfamiliar tasks</li>
          <li>Verify critical calculations a second time</li>
          <li>Sync data regularly (especially end-of-day)</li>
          <li>Upload PON PM reports regularly to track trends over time</li>
          <li>Review the FEC Corrected analysis to catch degrading links early</li>
          <li>Keep your LCP database up to date with GPS coordinates</li>
          <li>Submit useful documents you discover</li>
        </ul>

        <h3>Avoid</h3>
        <ul>
          <li>Relying solely on P.H.O.T.O.N. for critical safety decisions</li>
          <li>Taking photos of sensitive network architecture (if restricted)</li>
          <li>Forgetting to GPS-tag your locations</li>
          <li>Deleting conversations prematurely (audit trail may be needed)</li>
          <li>Using outdated documents from the reference library without checking the version date</li>
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