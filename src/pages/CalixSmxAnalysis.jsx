import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Activity, Cable, TrendingUp, FileText,
  Database, Radio, AlertCircle, AlertTriangle, CheckCircle2,
  Loader2
} from 'lucide-react';

const TABS = [
  { id: 'ponpm', label: 'PON PM Analysis', icon: FileText, description: 'Parse & analyze SMx PM exports' },
  { id: 'lcp', label: 'LCP / CLCP Database', icon: Cable, description: 'Cabinet & splitter reference' },
  { id: 'utilization', label: 'Splitter Utilization', icon: TrendingUp, description: 'Capacity & remaining ports' },
];

function NocStatusBar({ reports, latestReport }) {
  const totalOnts = latestReport?.ont_count || 0;
  const criticalCount = latestReport?.critical_count || 0;
  const warningCount = latestReport?.warning_count || 0;
  const okCount = latestReport?.ok_count || 0;
  const oltCount = latestReport?.olt_count || 0;
  const healthPct = totalOnts > 0 ? ((okCount / totalOnts) * 100).toFixed(1) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <StatusCard label="Total ONTs" value={totalOnts.toLocaleString()} color="text-blue-600" />
      <StatusCard label="OLTs" value={oltCount} color="text-indigo-600" />
      <StatusCard label="Critical" value={criticalCount} color="text-red-600" icon={AlertCircle} />
      <StatusCard label="Warnings" value={warningCount} color="text-amber-600" icon={AlertTriangle} />
      <StatusCard label="Healthy" value={okCount.toLocaleString()} color="text-green-600" icon={CheckCircle2} />
      <StatusCard label="Health" value={`${healthPct}%`} color="text-emerald-600" />
    </div>
  );
}

function StatusCard({ label, value, color, icon: Icon }) {
  return (
    <Card className="border-0 shadow">
      <CardContent className="p-3 text-center">
        <div className={`text-xl font-bold ${color} flex items-center justify-center gap-1`}>
          {Icon && <Icon className="h-4 w-4" />}
          {value}
        </div>
        <div className="text-[11px] text-gray-500 mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}

export default function CalixSmxAnalysis() {
  const [activeTab, setActiveTab] = useState('ponpm');

  const { data: savedReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['ponPmReports'],
    queryFn: () => base44.entities.PONPMReport.list('-upload_date', 5),
  });

  const { data: lcpEntries = [] } = useQuery({
    queryKey: ['lcpEntries'],
    queryFn: () => base44.entities.LCPEntry.list('-created_date', 5000),
  });

  const latestReport = savedReports[0] || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-white hover:bg-white/10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Radio className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white tracking-wide">Calix SMx ONT Analysis</h1>
                  <p className="text-[11px] text-cyan-400/70">Network Operations Center</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {latestReport && (
                <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-300 bg-cyan-500/10">
                  <Database className="h-3 w-3 mr-1" />
                  {latestReport.report_name?.substring(0, 30)}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                {lcpEntries.length} LCPs
              </Badge>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                {savedReports.length} Reports
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* NOC Status Bar */}
        {loadingReports ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 text-cyan-400 animate-spin mr-2" />
            <span className="text-sm text-slate-400">Loading network status...</span>
          </div>
        ) : latestReport ? (
          <NocStatusBar reports={savedReports} latestReport={latestReport} />
        ) : (
          <Card className="border border-slate-700 bg-slate-800/50">
            <CardContent className="p-4 text-center text-slate-400 text-sm">
              No PON PM reports yet. Upload your first report in the PON PM Analysis tab.
            </CardContent>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border whitespace-nowrap
                  ${isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-600'
                  }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content — navigates to existing pages */}
        <Card className="border border-slate-700 bg-slate-800/30 shadow-xl">
          <CardContent className="p-6">
            {activeTab === 'ponpm' && (
              <TabLauncher
                icon={FileText}
                title="PON PM Analysis"
                description="Upload and analyze Calix SMx Performance Monitoring CSV exports. Identify critical issues, track trends, and generate reports."
                features={[
                  'Parse SMx PM CSV exports with full ONT analysis',
                  'Critical issue detection with configurable thresholds',
                  'Historical trend tracking across multiple reports',
                  'Export to PDF, CSV, and issue reports',
                  'AI-powered job report generation for troubled ONTs',
                ]}
                pageName="PONPMAnalysis"
                buttonLabel="Open PON PM Analysis"
                stats={latestReport ? [
                  { label: 'Latest Report', value: latestReport.report_name?.substring(0, 25) || 'N/A' },
                  { label: 'ONTs Analyzed', value: latestReport.ont_count?.toLocaleString() || '0' },
                  { label: 'Issues Found', value: ((latestReport.critical_count || 0) + (latestReport.warning_count || 0)).toLocaleString() },
                ] : null}
              />
            )}
            {activeTab === 'lcp' && (
              <TabLauncher
                icon={Cable}
                title="LCP / CLCP Database"
                description="Manage your cabinet and splitter reference database. Import, search, and maintain your LCP/CLCP records with GPS coordinates and OLT assignments."
                features={[
                  'Full CRUD management for LCP/CLCP entries',
                  'CSV import/export with template download',
                  'GPS coordinates with interactive map view',
                  'OLT/Shelf/Slot/Port assignment tracking',
                  'Optic inventory management (make, model, serial)',
                ]}
                pageName="LCPInfo"
                buttonLabel="Open LCP Database"
                stats={lcpEntries.length > 0 ? [
                  { label: 'Total Entries', value: lcpEntries.length.toLocaleString() },
                  { label: 'With GPS', value: lcpEntries.filter(e => e.gps_lat && e.gps_lng).length.toLocaleString() },
                  { label: 'Unique LCPs', value: new Set(lcpEntries.map(e => e.lcp_number)).size.toLocaleString() },
                ] : null}
              />
            )}
            {activeTab === 'utilization' && (
              <TabLauncher
                icon={TrendingUp}
                title="Splitter Utilization"
                description="View LCP/CLCP capacity overview with real-time ONT counts from your latest PON PM report. Identify splitters nearing capacity."
                features={[
                  'Real-time ONT count aggregation by LCP/Splitter',
                  'Capacity utilization percentage visualization',
                  'Status breakdown (OK, Warning, Critical, Offline)',
                  'Powered by latest PON PM report data',
                  'Identifies splitters at risk of reaching capacity',
                ]}
                pageName="CapacityPlanning"
                buttonLabel="Open Splitter Utilization"
                stats={latestReport ? [
                  { label: 'Data Source', value: latestReport.report_name?.substring(0, 25) || 'N/A' },
                  { label: 'OLTs Covered', value: latestReport.olt_count || '0' },
                  { label: 'LCPs Tracked', value: lcpEntries.length > 0 ? new Set(lcpEntries.map(e => e.lcp_number)).size : '0' },
                ] : null}
              />
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <QuickLink to="DataManagement" icon={Database} label="ONT Records" description="View & manage indexed ONT records" />
          <QuickLink to="ReportManagement" icon={FileText} label="Report Management" description="Delete or purge saved reports" />
          <QuickLink to="LCPMap" icon={Activity} label="LCP Map View" description="Interactive map of LCP locations" />
        </div>
      </main>
    </div>
  );
}

function TabLauncher({ icon: Icon, title, description, features, pageName, buttonLabel, stats }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
          <Icon className="h-6 w-6 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-sm text-slate-400 mt-1">{description}</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-center">
              <div className="text-sm font-bold text-white truncate">{s.value}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Capabilities</h4>
        <ul className="space-y-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <Link to={createPageUrl(pageName)}>
        <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20">
          <Icon className="h-4 w-4 mr-2" />
          {buttonLabel}
        </Button>
      </Link>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, description }) {
  return (
    <Link to={createPageUrl(to)}>
      <Card className="border border-slate-700 bg-slate-800/30 hover:bg-slate-800/60 hover:border-slate-600 transition-all cursor-pointer">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">{label}</div>
            <div className="text-[11px] text-slate-500">{description}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}