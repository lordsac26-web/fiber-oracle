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
  ArrowLeft, 
  Palette, 
  Sliders, 
  Building2, 
  Save,
  Upload,
  Moon,
  Sun,
  Info,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Settings() {
  const [settings, setSettings] = useState({
    companyName: 'FiberTech Pro',
    logoUrl: '',
    primaryColor: '#3b82f6',
    darkMode: false,
    requirePhotos: true,
    customConnectorLoss: '',
    customSpliceLoss: '',
    customAttenuation: '',
    customFields: ['Job Number', 'Technician', 'Location']
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load settings from localStorage for now
    const savedSettings = localStorage.getItem('fibertechSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('fibertechSettings', JSON.stringify(settings));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
    setSaving(false);
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
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="bg-white dark:bg-gray-800 shadow-lg p-1 rounded-xl">
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
          </TabsList>

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
        </Tabs>

        {/* App Info */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">FiberTech Pro</h3>
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
      </main>
    </div>
  );
}