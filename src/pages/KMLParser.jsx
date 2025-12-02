import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ArrowLeft, 
  Upload, 
  MapPin, 
  Download, 
  FileText,
  Loader2,
  Search,
  Globe,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function KMLParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [placemarks, setPlacemarks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fileName, setFileName] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.kml') && !ext.endsWith('.kmz')) {
      toast.error('Please upload a .kml or .kmz file');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);
    toast.loading('Parsing coordinates...', { id: 'kml-parse' });

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const response = await base44.functions.invoke('parseKml', { file_url });

      if (response.data?.success) {
        setPlacemarks(response.data.placemarks);
        toast.success(`Found ${response.data.count} placemarks`, { id: 'kml-parse' });
      } else {
        toast.error(response.data?.error || 'Failed to parse file', { id: 'kml-parse' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process file', { id: 'kml-parse' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPlacemarks = placemarks.filter(p =>
    !searchTerm || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportData = (format) => {
    if (placemarks.length === 0) return;

    let content = '';
    let mimeType = '';
    let extension = '';

    if (format === 'csv') {
      const headers = ['Name', 'Latitude', 'Longitude', 'Altitude', 'Description'];
      const rows = filteredPlacemarks.map(p => [
        `"${p.name.replace(/"/g, '""')}"`,
        p.latitude,
        p.longitude,
        p.altitude || 0,
        `"${(p.description || '').replace(/"/g, '""')}"`
      ]);
      content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      mimeType = 'text/csv';
      extension = 'csv';
    } else {
      // TXT format
      content = 'KML/KMZ Coordinate Export\n';
      content += `File: ${fileName}\n`;
      content += `Exported: ${new Date().toLocaleString()}\n`;
      content += `Total Placemarks: ${filteredPlacemarks.length}\n`;
      content += '='.repeat(60) + '\n\n';

      filteredPlacemarks.forEach((p, i) => {
        content += `${i + 1}. ${p.name}\n`;
        content += `   Latitude:  ${p.latitude}\n`;
        content += `   Longitude: ${p.longitude}\n`;
        if (p.altitude) content += `   Altitude:  ${p.altitude}m\n`;
        if (p.description) content += `   Description: ${p.description}\n`;
        content += '\n';
      });

      mimeType = 'text/plain';
      extension = 'txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coordinates-${new Date().toISOString().slice(0, 10)}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredPlacemarks.length} placemarks as ${extension.toUpperCase()}`);
  };

  const copyCoordinates = (placemark, index) => {
    const text = `${placemark.latitude}, ${placemark.longitude}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success('Coordinates copied');
  };

  const openInGoogleMaps = (placemark) => {
    const url = `https://www.google.com/maps?q=${placemark.latitude},${placemark.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">KML/KMZ Parser</h1>
                <p className="text-xs text-gray-500">Extract coordinates from Google Earth files</p>
              </div>
            </div>
            {placemarks.length > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => exportData('csv')}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportData('txt')}>
                  <FileText className="h-4 w-4 mr-2" />
                  TXT
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Upload Section */}
        {placemarks.length === 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl">
                  <Globe className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Upload KML or KMZ File
                  </h2>
                  <p className="text-gray-500 mt-2 max-w-lg mx-auto">
                    Upload a Google Earth file to extract all placemark names and GPS coordinates.
                    Supports both .kml and .kmz formats.
                  </p>
                </div>

                <div className="max-w-md mx-auto">
                  <label className="block">
                    <div className={`border-2 border-dashed rounded-xl p-8 transition-colors cursor-pointer ${
                      isLoading ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50'
                    }`}>
                      {isLoading ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
                          <span className="text-sm text-gray-600">Processing...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <Upload className="h-10 w-10 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Click to upload or drag and drop
                          </span>
                          <span className="text-xs text-gray-400">.kml or .kmz files</span>
                        </div>
                      )}
                    </div>
                    <Input
                      type="file"
                      accept=".kml,.kmz"
                      onChange={handleFileUpload}
                      disabled={isLoading}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto mt-8">
                  <Card className="border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200">
                    <CardContent className="p-4">
                      <h3 className="font-semibold flex items-center gap-2 mb-2 text-emerald-800 dark:text-emerald-200">
                        <MapPin className="h-4 w-4" />
                        What It Extracts
                      </h3>
                      <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
                        <li>• Placemark names</li>
                        <li>• Latitude & Longitude</li>
                        <li>• Altitude (if available)</li>
                        <li>• Descriptions</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                    <CardContent className="p-4">
                      <h3 className="font-semibold flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-200">
                        <Download className="h-4 w-4" />
                        Export Options
                      </h3>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• CSV (spreadsheet compatible)</li>
                        <li>• TXT (human readable)</li>
                        <li>• Copy individual coordinates</li>
                        <li>• Open in Google Maps</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {placemarks.length > 0 && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-0 shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {placemarks.length}
                  </div>
                  <div className="text-xs text-gray-500">Placemarks Found</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    {filteredPlacemarks.length}
                  </div>
                  <div className="text-xs text-gray-500">Showing</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow col-span-2">
                <CardContent className="p-4">
                  <div className="text-xs text-gray-500 mb-1">Source File</div>
                  <div className="font-medium text-sm truncate">{fileName}</div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <Card className="border-0 shadow">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search placemarks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-0 shadow">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Latitude</TableHead>
                        <TableHead className="text-right">Longitude</TableHead>
                        <TableHead className="text-right">Altitude</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlacemarks.map((p, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-gray-500">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium">{p.name}</div>
                            {p.description && (
                              <div className="text-xs text-gray-500 truncate max-w-xs">
                                {p.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {p.latitude.toFixed(6)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {p.longitude.toFixed(6)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-gray-500">
                            {p.altitude ? `${p.altitude.toFixed(1)}m` : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => copyCoordinates(p, idx)}
                                title="Copy coordinates"
                              >
                                {copiedIndex === idx ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openInGoogleMaps(p)}
                                title="Open in Google Maps"
                              >
                                <MapPin className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* New Upload */}
            <div className="text-center pt-4">
              <Button 
                variant="outline" 
                onClick={() => { setPlacemarks([]); setFileName(''); setSearchTerm(''); }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload New File
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}