import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft, Activity, Cable, TrendingUp, FileText,
  Database, Radio, CheckCircle2
} from 'lucide-react';

const TABS = [
  { id: 'ponpm', label: 'PON PM Analysis', icon: FileText, description: 'Parse & analyze SMx PM exports' },
  { id: 'lcp', label: 'LCP / CLCP Database', icon: Cable, description: 'Cabinet & splitter reference' },
  { id: 'utilization', label: 'Splitter Utilization', icon: TrendingUp, description: 'Capacity & remaining ports' },
];

export default function CalixSmxAnalysis() {
  const [activeTab, setActiveTab] = useState('ponpm');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Radio className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Calix SMx ONT Analysis</h1>
                  <p className="text-xs text-gray-500">Network Operations Center</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
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
                    ? 'bg-blue-600 dark:bg-blue-600 border-blue-700 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <Card className="border-0 shadow-lg">
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
                stats={null}
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
                stats={null}
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
                stats={null}
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
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 dark:from-cyan-500/20 dark:to-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center shrink-0">
          <Icon className="h-6 w-6 text-blue-600 dark:text-cyan-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
              <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.value}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Capabilities</h4>
        <ul className="space-y-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <CheckCircle2 className="h-4 w-4 text-blue-500 dark:text-cyan-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <Link to={createPageUrl(pageName)}>
        <Button className="w-full">
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
      <Card className="border-0 shadow hover:shadow-md transition-all cursor-pointer">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">{description}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}