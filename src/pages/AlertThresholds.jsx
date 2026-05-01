import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Activity,
  Zap,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useUserPreferences } from '@/components/UserPreferencesContext';
import { toast } from 'sonner';

// Canonical defaults — mirrors parsePonPm backend
const DEFAULT_THRESHOLDS = {
  OntRxOptPwr:                    { low: -27,   marginal: -25,  high: -8   },
  OLTRXOptPwr:                    { low: -30,   marginal: -28,  high: -8   },
  UpstreamBipErrors:              { warning: 100,   critical: 1000  },
  DownstreamBipErrors:            { warning: 100,   critical: 1000  },
  UpstreamFecUncorrectedCodeWords: { warning: 1,     critical: 10    },
  DownstreamFecUncorrectedCodeWords: { warning: 1,   critical: 10    },
  UpstreamMissedBursts:           { warning: 10,    critical: 100   },
  UpstreamGemHecErrors:           { warning: 10,    critical: 100   },
};

// ─── Reusable field row ──────────────────────────────────────────────────────
function ThresholdRow({ label, field, keys, thresholds, onChange, unit = '' }) {
  return (
    <div className="grid grid-cols-12 items-center gap-3">
      <div className="col-span-4 text-sm font-medium text-gray-700">{label}</div>
      {keys.map(({ key, label: kLabel, color }) => (
        <div key={key} className="col-span-4 space-y-1">
          <Label className={`text-xs ${color}`}>{kLabel}</Label>
          <div className="relative">
            <Input
              type="number"
              step="0.1"
              value={thresholds[field]?.[key] ?? ''}
              onChange={(e) => onChange(field, key, e.target.value)}
              className="pr-10 font-mono text-sm"
            />
            {unit && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                {unit}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Status preview pill ─────────────────────────────────────────────────────
function StatusPreview({ thresholds }) {
  const t = thresholds;
  return (
    <Card className="border border-blue-200 bg-blue-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
          <Info className="h-4 w-4" />
          Live Threshold Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="font-semibold text-gray-600">ONT Rx Power</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <span>Critical: &lt; {t.OntRxOptPwr?.low} dBm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>Warning: &lt; {t.OntRxOptPwr?.marginal} dBm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              <span>High: &gt; {t.OntRxOptPwr?.high} dBm</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-gray-600">OLT Rx Power</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <span>Critical: &lt; {t.OLTRXOptPwr?.low} dBm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>Warning: &lt; {t.OLTRXOptPwr?.marginal} dBm</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-gray-600">BIP Errors</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <span>Critical: ≥ {t.UpstreamBipErrors?.critical?.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>Warning: ≥ {t.UpstreamBipErrors?.warning?.toLocaleString()}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-gray-600">FEC Uncorrected</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <span>Critical: ≥ {t.UpstreamFecUncorrectedCodeWords?.critical}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>Warning: ≥ {t.UpstreamFecUncorrectedCodeWords?.warning}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AlertThresholds() {
  const { preferences, updatePreferences, isSaving } = useUserPreferences();

  const [thresholds, setThresholds] = useState(() => {
    // Prefer preferences, fall back to localStorage, then hardcoded defaults
    if (preferences?.alertThresholds) return { ...DEFAULT_THRESHOLDS, ...preferences.alertThresholds };
    const saved = localStorage.getItem('ponPmThresholds');
    return saved ? { ...DEFAULT_THRESHOLDS, ...JSON.parse(saved) } : { ...DEFAULT_THRESHOLDS };
  });

  // Sync from preferences when they load
  useEffect(() => {
    if (preferences?.alertThresholds) {
      setThresholds({ ...DEFAULT_THRESHOLDS, ...preferences.alertThresholds });
    }
  }, [preferences?.alertThresholds]);

  const handleChange = (field, key, rawValue) => {
    const value = rawValue === '' ? '' : parseFloat(rawValue);
    setThresholds(prev => ({
      ...prev,
      [field]: { ...prev[field], [key]: value },
    }));
  };

  // Mirror change on linked symmetric fields (US/DS share same config for BIP, FEC)
  const handleSymmetric = (usField, dsField, key, rawValue) => {
    const value = rawValue === '' ? '' : parseFloat(rawValue);
    setThresholds(prev => ({
      ...prev,
      [usField]: { ...prev[usField], [key]: value },
      [dsField]: { ...prev[dsField], [key]: value },
    }));
  };

  const handleSave = async () => {
    // Persist to both localStorage and user preferences (cross-device)
    localStorage.setItem('ponPmThresholds', JSON.stringify(thresholds));
    await updatePreferences({ alertThresholds: thresholds });
    toast.success('Alert thresholds saved — upload a new report to apply them');
  };

  const handleReset = async () => {
    setThresholds({ ...DEFAULT_THRESHOLDS });
    localStorage.removeItem('ponPmThresholds');
    await updatePreferences({ alertThresholds: null });
    toast.success('Thresholds reset to factory defaults');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Settings')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Global Alert Thresholds</h1>
                <p className="text-xs text-gray-500">Configure dBm and error limits that determine ONT status</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleReset} disabled={isSaving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Defaults
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Thresholds'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Info banner */}
        <Card className="border-0 shadow bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">How thresholds are applied</p>
              <p>These thresholds are sent to the parser on every new CSV upload. Saved reports were analyzed with the thresholds active at upload time — re-upload the file to re-analyze with new values.</p>
            </div>
          </CardContent>
        </Card>

        {/* Live preview */}
        <StatusPreview thresholds={thresholds} />

        {/* Optical Power */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Optical Power Thresholds (dBm)
            </CardTitle>
            <CardDescription>
              Signal levels that trigger Warning or Critical status. Lower (more negative) = weaker signal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status legend */}
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                <AlertCircle className="h-3.5 w-3.5" /> Critical
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" /> Warning
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                <CheckCircle2 className="h-3.5 w-3.5" /> OK (between warning &amp; high)
              </div>
            </div>

            <Separator />

            {/* ONT Rx */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">ONT Receive Power</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-red-600 font-semibold">Critical if below (dBm)</Label>
                  <Input
                    type="number" step="0.1"
                    value={thresholds.OntRxOptPwr?.low ?? ''}
                    onChange={(e) => handleChange('OntRxOptPwr', 'low', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-amber-600 font-semibold">Warning if below (dBm)</Label>
                  <Input
                    type="number" step="0.1"
                    value={thresholds.OntRxOptPwr?.marginal ?? ''}
                    onChange={(e) => handleChange('OntRxOptPwr', 'marginal', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-orange-600 font-semibold">Warning if above (dBm)</Label>
                  <Input
                    type="number" step="0.1"
                    value={thresholds.OntRxOptPwr?.high ?? ''}
                    onChange={(e) => handleChange('OntRxOptPwr', 'high', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Factory defaults: Critical &lt; <span className="font-mono">-27</span>, Warning &lt; <span className="font-mono">-25</span>, High &gt; <span className="font-mono">-8</span>
              </p>
            </div>

            <Separator />

            {/* OLT Rx */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">OLT Receive Power</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-red-600 font-semibold">Critical if below (dBm)</Label>
                  <Input
                    type="number" step="0.1"
                    value={thresholds.OLTRXOptPwr?.low ?? ''}
                    onChange={(e) => handleChange('OLTRXOptPwr', 'low', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-amber-600 font-semibold">Warning if below (dBm)</Label>
                  <Input
                    type="number" step="0.1"
                    value={thresholds.OLTRXOptPwr?.marginal ?? ''}
                    onChange={(e) => handleChange('OLTRXOptPwr', 'marginal', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-orange-600 font-semibold">Warning if above (dBm)</Label>
                  <Input
                    type="number" step="0.1"
                    value={thresholds.OLTRXOptPwr?.high ?? ''}
                    onChange={(e) => handleChange('OLTRXOptPwr', 'high', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Factory defaults: Critical &lt; <span className="font-mono">-30</span>, Warning &lt; <span className="font-mono">-28</span>, High &gt; <span className="font-mono">-8</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error Counters */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-red-500" />
              Error Counter Thresholds
            </CardTitle>
            <CardDescription>
              Error counts at or above these values trigger the corresponding alert level. US and DS share the same thresholds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* BIP Errors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">BIP Errors (US + DS)</h4>
                <Badge variant="outline" className="text-xs font-mono">
                  Default: W≥100 / C≥1000
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-amber-600 font-semibold">Warning if ≥</Label>
                  <Input
                    type="number"
                    value={thresholds.UpstreamBipErrors?.warning ?? ''}
                    onChange={(e) => handleSymmetric('UpstreamBipErrors', 'DownstreamBipErrors', 'warning', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-red-600 font-semibold">Critical if ≥</Label>
                  <Input
                    type="number"
                    value={thresholds.UpstreamBipErrors?.critical ?? ''}
                    onChange={(e) => handleSymmetric('UpstreamBipErrors', 'DownstreamBipErrors', 'critical', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* FEC Uncorrected */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">FEC Uncorrected Codewords (US + DS)</h4>
                <Badge variant="outline" className="text-xs font-mono">
                  Default: W≥1 / C≥10
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-amber-600 font-semibold">Warning if ≥</Label>
                  <Input
                    type="number"
                    value={thresholds.UpstreamFecUncorrectedCodeWords?.warning ?? ''}
                    onChange={(e) => handleSymmetric('UpstreamFecUncorrectedCodeWords', 'DownstreamFecUncorrectedCodeWords', 'warning', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-red-600 font-semibold">Critical if ≥</Label>
                  <Input
                    type="number"
                    value={thresholds.UpstreamFecUncorrectedCodeWords?.critical ?? ''}
                    onChange={(e) => handleSymmetric('UpstreamFecUncorrectedCodeWords', 'DownstreamFecUncorrectedCodeWords', 'critical', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Missed Bursts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">Upstream Missed Bursts</h4>
                <Badge variant="outline" className="text-xs font-mono">
                  Default: W≥10 / C≥100
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-amber-600 font-semibold">Warning if ≥</Label>
                  <Input
                    type="number"
                    value={thresholds.UpstreamMissedBursts?.warning ?? ''}
                    onChange={(e) => handleChange('UpstreamMissedBursts', 'warning', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-red-600 font-semibold">Critical if ≥</Label>
                  <Input
                    type="number"
                    value={thresholds.UpstreamMissedBursts?.critical ?? ''}
                    onChange={(e) => handleChange('UpstreamMissedBursts', 'critical', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* GEM HEC */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">Upstream GEM HEC Errors</h4>
                <Badge variant="outline" className="text-xs font-mono">
                  Default: W≥10 / C≥100
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-amber-600 font-semibold">Warning if ≥</Label>
                  <Input
                    type="number"
                    value={thresholds.UpstreamGemHecErrors?.warning ?? ''}
                    onChange={(e) => handleChange('UpstreamGemHecErrors', 'warning', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-red-600 font-semibold">Critical if ≥</Label>
                  <Input
                    type="number"
                    value={thresholds.UpstreamGemHecErrors?.critical ?? ''}
                    onChange={(e) => handleChange('UpstreamGemHecErrors', 'critical', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Save footer */}
        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="px-8">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Thresholds'}
          </Button>
        </div>
      </main>
    </div>
  );
}