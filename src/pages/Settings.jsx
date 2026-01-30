import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Palette, 
  Sliders, 
  Building2, 
  Save,
  Upload,
  Moon,
  Sun,
  Info,
  CheckCircle2,
  User,
  Ruler,
  LogOut,
  HelpCircle,
  RotateCcw,
  Eye,
  EyeOff,
  Database,
  Trash2,
  AlertTriangle,
  Loader2,
  Download,
  FileUp
} from 'lucide-react';
import ModuleVisibilitySettings from '@/components/ModuleVisibilitySettings';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useUserPreferences } from '@/components/UserPreferencesContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery } from '@tanstack/react-query';

export default function Settings() {
    const { preferences, updatePreferences, isSaving, isAuthenticated, user } = useUserPreferences();
    const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
    const [purgeType, setPurgeType] = useState(null);
    const [isPurging, setIsPurging] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRefs = {
      pon_pm_all: React.useRef(null),
      lcp_all: React.useRef(null),
      job_reports_all: React.useRef(null),
      test_reports_all: React.useRef(null),
    };

    // Check for tab param from URL
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab') || 'preferences';

    const [settings, setSettings] = useState({
    companyName: 'Fiber Oracle',
    logoUrl: '',
    primaryColor: '#3b82f6',
    darkMode: false,
    requirePhotos: true,
    customConnectorLoss: '',
    customSpliceLoss: '',
    customAttenuation: '',
    customFields: ['Job Number', 'Technician', 'Location'],
    units: 'metric',
    defaultSortOrder: 'desc',
    defaultSortBy: 'created_date',
  });

  useEffect(() => {
    setSettings({
      companyName: preferences.companyName || 'Fiber Oracle',
      logoUrl: preferences.logoUrl || '',
      primaryColor: preferences.primaryColor || '#3b82f6',
      darkMode: preferences.darkMode || false,
      requirePhotos: preferences.requirePhotos ?? true,
      customConnectorLoss: preferences.customConnectorLoss?.toString() || '',
      customSpliceLoss: preferences.customSpliceLoss?.toString() || '',
      customAttenuation: preferences.customAttenuation?.toString() || '',
      customFields: preferences.customFields || ['Job Number', 'Technician', 'Location'],
      units: preferences.units || 'metric',
      defaultSortOrder: preferences.defaultSortOrder || 'desc',
      defaultSortBy: preferences.defaultSortBy || 'created_date',
    });
  }, [preferences]);

  const handleSave = async () => {
    try {
      await updatePreferences({
        ...settings,
        customConnectorLoss: settings.customConnectorLoss ? parseFloat(settings.customConnectorLoss) : null,
        customSpliceLoss: settings.customSpliceLoss ? parseFloat(settings.customSpliceLoss) : null,
        customAttenuation: settings.customAttenuation ? parseFloat(settings.customAttenuation) : null,
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const addCustomField = () => {
    setSettings({
      ...settings,
      customFields: [...settings.customFields, 'New Field']
    });
  };

  const removeCustomField = (index) => {
    setSettings({
      ...settings,
      customFields: settings.customFields.filter((_, i) => i !== index)
    });
  };

  const updateCustomField = (index, value) => {
    const newFields = [...settings.customFields];
    newFields[index] = value;
    setSettings({ ...settings, customFields: newFields });
  };

  // Fetch data counts for stored data section
  const { data: ponReports = [] } = useQuery({
    queryKey: ['ponReports'],
    queryFn: () => base44.entities.PONPMReport.list(),
    enabled: isAuthenticated,
  });

  const { data: ontRecords = [] } = useQuery({
    queryKey: ['ontRecordsCount'],
    queryFn: () => base44.entities.ONTPerformanceRecord.list('', 1),
    enabled: isAuthenticated,
  });

  const { data: lcpEntries = [] } = useQuery({
    queryKey: ['lcpEntries'],
    queryFn: () => base44.entities.LCPEntry.list(),
    enabled: isAuthenticated,
  });

  const { data: jobReports = [] } = useQuery({
    queryKey: ['jobReports'],
    queryFn: () => base44.entities.JobReport.list(),
    enabled: isAuthenticated,
  });

  const { data: testReports = [] } = useQuery({
    queryKey: ['testReports'],
    queryFn: () => base44.entities.TestReport.list(),
    enabled: isAuthenticated,
  });

  const handlePurge = async () => {
    setIsPurging(true);
    try {
      const response = await base44.functions.invoke('purgeModuleData', {
        module_type: purgeType
      });

      if (response.data.success) {
        toast.success(response.data.message);
        // Invalidate queries to refresh counts
        window.location.reload();
      } else {
        toast.error('Failed to purge data');
      }
    } catch (error) {
      console.error('Purge error:', error);
      toast.error('Failed to purge data: ' + error.message);
    } finally {
      setIsPurging(false);
      setPurgeDialogOpen(false);
      setPurgeType(null);
    }
  };

  const openPurgeDialog = (type) => {
    setPurgeType(type);
    setPurgeDialogOpen(true);
  };

  const getPurgeDialogContent = () => {
    switch (purgeType) {
      case 'pon_pm_all':
        return {
          title: 'Delete All PON PM Data?',
          description: `This will permanently delete ${ponReports.length} reports and all associated ONT performance records. This action cannot be undone.`,
        };
      case 'lcp_all':
        return {
          title: 'Delete All LCP Data?',
          description: `This will permanently delete ${lcpEntries.length} LCP entries. This action cannot be undone.`,
        };
      case 'job_reports_all':
        return {
          title: 'Delete All Job Reports?',
          description: `This will permanently delete ${jobReports.length} job reports. This action cannot be undone.`,
        };
      case 'test_reports_all':
        return {
          title: 'Delete All Test Reports?',
          description: `This will permanently delete ${testReports.length} test reports. This action cannot be undone.`,
        };
      default:
        return { title: 'Confirm Deletion', description: 'Are you sure?' };
    }
  };

  const handleExport = async (moduleType) => {
    setIsExporting(true);
    try {
      const response = await base44.functions.invoke('exportModuleData', {
        module_type: moduleType
      });

      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${moduleType}_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (moduleType, file) => {
    if (!file) return;
    
    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const response = await base44.functions.invoke('importModuleData', {
        module_type: moduleType,
        data: data
      });

      if (response.data.success) {
        toast.success(response.data.message);
        window.location.reload();
      } else {
        toast.error('Failed to import data');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import data: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-xs text-gray-500">Customize your app</p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* User Profile Card */}
        {isAuthenticated && user && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{user.full_name || 'User'}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <Badge className="ml-auto" variant="outline">
                  <User className="h-3 w-3 mr-1" />
                  {user.role || 'user'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue={initialTab} className="space-y-6">
          <TabsList className="bg-white dark:bg-gray-800 shadow-lg p-1 rounded-xl flex-wrap">
            <TabsTrigger value="preferences" className="rounded-lg">
              <User className="h-4 w-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="visibility" className="rounded-lg">
              <Eye className="h-4 w-4 mr-2" />
              Visibility
            </TabsTrigger>
            <TabsTrigger value="branding" className="rounded-lg">
              <Building2 className="h-4 w-4 mr-2" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="appearance" className="rounded-lg">
              <Palette className="h-4 w-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="testing" className="rounded-lg">
              <Sliders className="h-4 w-4 mr-2" />
              Test Values
            </TabsTrigger>
            <TabsTrigger value="data" className="rounded-lg">
              <Database className="h-4 w-4 mr-2" />
              Stored Data
            </TabsTrigger>
          </TabsList>

          {/* User Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>User Preferences</CardTitle>
                <CardDescription>Customize your personal app experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Measurement Units
                    </Label>
                    <Select 
                      value={settings.units} 
                      onValueChange={(v) => setSettings({...settings, units: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="metric">Metric (km, m)</SelectItem>
                        <SelectItem value="imperial">Imperial (mi, ft)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">Used in calculators and distance displays</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Default Sort Order</Label>
                    <Select 
                      value={settings.defaultSortOrder} 
                      onValueChange={(v) => setSettings({...settings, defaultSortOrder: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Newest First</SelectItem>
                        <SelectItem value="asc">Oldest First</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">Default sort order for lists and reports</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Default Sort Field</Label>
                    <Select 
                      value={settings.defaultSortBy} 
                      onValueChange={(v) => setSettings({...settings, defaultSortBy: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_date">Date Created</SelectItem>
                        <SelectItem value="updated_date">Date Updated</SelectItem>
                        <SelectItem value="job_number">Job Number</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">Default field to sort by in lists</p>
                  </div>
                </div>

                {!isAuthenticated && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-800 dark:text-amber-200">Local Storage Only</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Settings are saved locally. Sign in to sync preferences across devices.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              </Card>
              </TabsContent>

              {/* Visibility Tab */}
              <TabsContent value="visibility" className="space-y-6">
              <ModuleVisibilitySettings />

              {/* Hidden Content Info */}
              <Card className="border-0 shadow-lg bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">About Hidden Content</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                      <li>Hidden modules won't appear on the home screen</li>
                      <li>Hidden sections won't appear within modules</li>
                      <li>A banner will remind you when content is hidden</li>
                      <li>You can always restore hidden content here</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
              </Card>
              </TabsContent>

              {/* Branding Tab */}
              <TabsContent value="branding" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Company Branding</CardTitle>
                <CardDescription>Customize the app with your company identity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={settings.companyName}
                    onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                    placeholder="Your Company Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                      {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                      ) : (
                        <Upload className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={settings.logoUrl}
                        onChange={(e) => setSettings({...settings, logoUrl: e.target.value})}
                        placeholder="Logo URL"
                      />
                      <p className="text-xs text-gray-500">Enter a URL or upload an image</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Custom Report Fields</Label>
                  <p className="text-sm text-gray-500">Add custom fields that appear on all test reports</p>
                  
                  <div className="space-y-2">
                    {settings.customFields.map((field, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={field}
                          onChange={(e) => updateCustomField(index, e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomField(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <Button variant="outline" onClick={addCustomField}>
                    Add Custom Field
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize colors and theme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {settings.darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    <div>
                      <Label>Dark Mode</Label>
                      <p className="text-sm text-gray-500">Use dark theme</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.darkMode}
                    onCheckedChange={(checked) => setSettings({...settings, darkMode: checked})}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                      className="w-12 h-12 rounded-lg cursor-pointer border-0"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                      className="w-32 font-mono"
                    />
                    <div className="flex gap-2">
                      {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(color => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-full border-2 ${settings.primaryColor === color ? 'border-gray-900' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setSettings({...settings, primaryColor: color})}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testing Values Tab */}
          <TabsContent value="testing" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Custom Test Values</CardTitle>
                <CardDescription>Override default TIA values with company-specific specifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-200">Custom Values</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Leave fields empty to use industry standard TIA values. 
                        Custom values will be used in all calculators when specified.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Connector Loss (dB)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={settings.customConnectorLoss}
                      onChange={(e) => setSettings({...settings, customConnectorLoss: e.target.value})}
                      placeholder="Default: 0.15 (elite)"
                    />
                    <p className="text-xs text-gray-500">TIA standard: ≤0.15 dB (elite)</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Splice Loss (dB)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={settings.customSpliceLoss}
                      onChange={(e) => setSettings({...settings, customSpliceLoss: e.target.value})}
                      placeholder="Default: 0.10 (fusion)"
                    />
                    <p className="text-xs text-gray-500">TIA standard: ≤0.10 dB (fusion)</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Fiber Attenuation (dB/km)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={settings.customAttenuation}
                      onChange={(e) => setSettings({...settings, customAttenuation: e.target.value})}
                      placeholder="Default: 0.35 (SMF @1310)"
                    />
                    <p className="text-xs text-gray-500">TIA standard: ≤0.35 dB/km (SMF)</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Photo Documentation</Label>
                    <p className="text-sm text-gray-500">Require before/after photos for all tests</p>
                  </div>
                  <Switch
                    checked={settings.requirePhotos}
                    onCheckedChange={(checked) => setSettings({...settings, requirePhotos: checked})}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Current Standards Quick Reference */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
              <CardHeader>
                <CardTitle className="text-base">TIA-568-D Reference Values</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">SMF @1310nm</span>
                    <div className="font-mono font-semibold">≤0.35 dB/km</div>
                  </div>
                  <div>
                    <span className="text-gray-500">SMF @1550nm</span>
                    <div className="font-mono font-semibold">≤0.25 dB/km</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Elite Connector</span>
                    <div className="font-mono font-semibold">≤0.15 dB</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Fusion Splice</span>
                    <div className="font-mono font-semibold">≤0.10 dB</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stored Data Tab */}
          <TabsContent value="data" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Stored Data Management</CardTitle>
                <CardDescription>View and manage your stored data across different modules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800 dark:text-amber-200">Destructive Actions</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Purging data is permanent and cannot be undone. Make sure you have backups if needed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* PON PM Data */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">PON PM Analysis Data</h3>
                      <p className="text-sm text-gray-500">Reports and ONT performance records</p>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {ponReports.length} reports
                    </Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('pon_pm_all')}
                      disabled={ponReports.length === 0 || isExporting}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Backup
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRefs.pon_pm_all.current?.click()}
                      disabled={isImporting}
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      Import Backup
                    </Button>
                    <input
                      ref={fileInputRefs.pon_pm_all}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => handleImportFile('pon_pm_all', e.target.files[0])}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openPurgeDialog('pon_pm_all')}
                      disabled={ponReports.length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Purge All
                    </Button>
                  </div>
                </div>

                {/* LCP Data */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">LCP Database</h3>
                      <p className="text-sm text-gray-500">Local convergence point entries</p>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {lcpEntries.length} entries
                    </Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('lcp_all')}
                      disabled={lcpEntries.length === 0 || isExporting}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Backup
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRefs.lcp_all.current?.click()}
                      disabled={isImporting}
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      Import Backup
                    </Button>
                    <input
                      ref={fileInputRefs.lcp_all}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => handleImportFile('lcp_all', e.target.files[0])}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openPurgeDialog('lcp_all')}
                      disabled={lcpEntries.length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Purge All
                    </Button>
                  </div>
                </div>

                {/* Job Reports */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Job Reports</h3>
                      <p className="text-sm text-gray-500">Field service and maintenance reports</p>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {jobReports.length} reports
                    </Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('job_reports_all')}
                      disabled={jobReports.length === 0 || isExporting}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Backup
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRefs.job_reports_all.current?.click()}
                      disabled={isImporting}
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      Import Backup
                    </Button>
                    <input
                      ref={fileInputRefs.job_reports_all}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => handleImportFile('job_reports_all', e.target.files[0])}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openPurgeDialog('job_reports_all')}
                      disabled={jobReports.length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Purge All
                    </Button>
                  </div>
                </div>

                {/* Test Reports */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Test Reports</h3>
                      <p className="text-sm text-gray-500">OTDR, loss budget, and other test reports</p>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {testReports.length} reports
                    </Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('test_reports_all')}
                      disabled={testReports.length === 0 || isExporting}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Backup
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRefs.test_reports_all.current?.click()}
                      disabled={isImporting}
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      Import Backup
                    </Button>
                    <input
                      ref={fileInputRefs.test_reports_all}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => handleImportFile('test_reports_all', e.target.files[0])}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openPurgeDialog('test_reports_all')}
                      disabled={testReports.length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Purge All
                    </Button>
                  </div>
                </div>

                {!isAuthenticated && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800 dark:text-blue-200">Sign In Required</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Sign in to manage your stored data across modules.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* App Info */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Fiber Oracle</h3>
                <p className="text-sm text-gray-500">Version 2.0.0</p>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Up to date
              </Badge>
            </div>
            <Separator className="my-4" />
            <div className="text-sm text-gray-500 space-y-1">
              <p>Standards: TIA-568-D, TIA-526-14-C, IEC 61300, IEEE 802.3</p>
              <p>Reference values updated: 2025</p>
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Tour */}
                      <Card className="border-0 shadow-lg">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                                <HelpCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">App Tour</h3>
                                <p className="text-sm text-gray-500">Learn about Fiber Oracle's features</p>
                              </div>
                            </div>
                            <Link to={createPageUrl('Home') + '?tour=1'}>
                              <Button variant="outline">
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Restart Tour
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Logout */}
                      {isAuthenticated && (
                        <Card className="border-0 shadow-lg border-red-100">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Sign Out</h3>
                                <p className="text-sm text-gray-500">Log out of your account</p>
                              </div>
                              <Button 
                                variant="outline" 
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                onClick={() => base44.auth.logout()}
                              >
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      </main>

                      {/* Purge Confirmation Dialog */}
                      <AlertDialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
                      <AlertDialogContent>
                      <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      {getPurgeDialogContent().title}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                      {getPurgeDialogContent().description}
                      </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                      <AlertDialogCancel disabled={isPurging}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                      onClick={handlePurge}
                      disabled={isPurging}
                      className="bg-red-600 hover:bg-red-700"
                      >
                      {isPurging ? (
                      <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Purging...
                      </>
                      ) : (
                      <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Purge Data
                      </>
                      )}
                      </AlertDialogAction>
                      </AlertDialogFooter>
                      </AlertDialogContent>
                      </AlertDialog>
                      </div>
                      );
                      }