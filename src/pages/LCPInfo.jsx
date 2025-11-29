import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  MapPin, 
  Server, 
  Trash2, 
  Edit2, 
  Save,
  X,
  Cable,
  Upload,
  FileText,
  Download,
  Map,
  Navigation,
  Loader2,
  CloudOff,
  Cloud,
  List,
  LayoutGrid,
  Info
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function LCPInfo() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importError, setImportError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    lcpNumber: '',
    splitterNumber: '',
    physicalLocation: '',
    latitude: '',
    longitude: '',
    oltName: '',
    oltShelf: '',
    oltSlot: '',
    oltPort: '',
    opticMake: '',
    opticModel: '',
    opticSerial: '',
    notes: ''
  });

  // Fetch LCP entries from database
  const { data: lcpEntries = [], isLoading, error } = useQuery({
    queryKey: ['lcpEntries'],
    queryFn: () => base44.entities.LCPEntry.list('-created_date'),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LCPEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lcpEntries'] });
      toast.success('LCP entry added');
      resetForm();
      setShowAddDialog(false);
    },
    onError: () => toast.error('Failed to save entry'),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LCPEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lcpEntries'] });
      toast.success('LCP entry updated');
      resetForm();
      setShowAddDialog(false);
    },
    onError: () => toast.error('Failed to update entry'),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LCPEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lcpEntries'] });
      toast.success('LCP entry deleted');
    },
    onError: () => toast.error('Failed to delete entry'),
  });

  // Bulk create mutation for imports
  const bulkCreateMutation = useMutation({
    mutationFn: (entries) => base44.entities.LCPEntry.bulkCreate(entries),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lcpEntries'] });
      toast.success(`Imported ${variables.length} entries`);
      setShowImportDialog(false);
      setImportPreview([]);
      setImportError('');
    },
    onError: () => toast.error('Failed to import entries'),
  });

  const resetForm = () => {
    setFormData({
      lcpNumber: '',
      splitterNumber: '',
      physicalLocation: '',
      latitude: '',
      longitude: '',
      oltName: '',
      oltShelf: '',
      oltSlot: '',
      oltPort: '',
      opticMake: '',
      opticModel: '',
      opticSerial: '',
      notes: ''
    });
    setEditingId(null);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          });
          toast.success('Location captured!');
        },
        (error) => {
          toast.error('Unable to get location. Please enter manually.');
        }
      );
    } else {
      toast.error('Geolocation not supported by this browser.');
    }
  };

  const entriesWithCoords = lcpEntries.filter(e => e.gps_lat && e.gps_lng);

  const handleSubmit = () => {
    if (!formData.lcpNumber || !formData.splitterNumber) {
      toast.error('LCP Number and Splitter Number are required');
      return;
    }

    const entryData = {
      lcp_number: formData.lcpNumber,
      splitter_number: formData.splitterNumber,
      location: formData.physicalLocation,
      gps_lat: formData.latitude ? parseFloat(formData.latitude) : null,
      gps_lng: formData.longitude ? parseFloat(formData.longitude) : null,
      olt_shelf: formData.oltShelf,
      olt_slot: formData.oltSlot,
      olt_port: formData.oltPort,
      optic_make: formData.opticMake,
      optic_model: formData.opticModel,
      optic_serial: formData.opticSerial,
      notes: formData.notes,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: entryData });
    } else {
      createMutation.mutate(entryData);
    }
  };

  const handleEdit = (entry) => {
    setFormData({
      lcpNumber: entry.lcp_number || '',
      splitterNumber: entry.splitter_number || '',
      physicalLocation: entry.location || '',
      latitude: entry.gps_lat?.toString() || '',
      longitude: entry.gps_lng?.toString() || '',
      oltName: '',
      oltShelf: entry.olt_shelf || '',
      oltSlot: entry.olt_slot || '',
      oltPort: entry.olt_port || '',
      opticMake: entry.optic_make || '',
      opticModel: entry.optic_model || '',
      opticSerial: entry.optic_serial || '',
      notes: entry.notes || ''
    });
    setEditingId(entry.id);
    setShowAddDialog(true);
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportError('');
    setImportPreview([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      try {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          setImportError('File must have a header row and at least one data row');
          return;
        }

        // Parse header
        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        
        // Map common header variations
        const headerMap = {
          'lcp': 'lcpNumber', 'lcp_number': 'lcpNumber', 'lcpnumber': 'lcpNumber', 'lcp number': 'lcpNumber', 'clcp': 'lcpNumber',
          'splitter': 'splitterNumber', 'splitter_number': 'splitterNumber', 'splitternumber': 'splitterNumber', 'splitter number': 'splitterNumber',
          'location': 'physicalLocation', 'physical_location': 'physicalLocation', 'address': 'physicalLocation',
          'latitude': 'latitude', 'lat': 'latitude', 'gps_lat': 'latitude',
          'longitude': 'longitude', 'lon': 'longitude', 'lng': 'longitude', 'gps_lon': 'longitude', 'gps_lng': 'longitude',
          'olt': 'oltName', 'olt_name': 'oltName', 'oltname': 'oltName',
          'shelf': 'oltShelf', 'olt_shelf': 'oltShelf',
          'slot': 'oltSlot', 'olt_slot': 'oltSlot',
          'port': 'oltPort', 'olt_port': 'oltPort', 'ports': 'oltPort',
          'optic_make': 'opticMake', 'opticmake': 'opticMake', 'make': 'opticMake',
          'optic_model': 'opticModel', 'opticmodel': 'opticModel', 'model': 'opticModel',
          'optic_serial': 'opticSerial', 'opticserial': 'opticSerial', 'serial': 'opticSerial',
          'notes': 'notes', 'note': 'notes', 'comments': 'notes'
        };

        const mappedHeaders = headers.map(h => headerMap[h] || h);

        // Parse data rows
        const entries = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
          if (values.length < 2) continue;

          const entry = { id: Date.now() + i };
          mappedHeaders.forEach((header, idx) => {
            if (values[idx]) entry[header] = values[idx];
          });

          if (entry.lcpNumber || entry.splitterNumber) {
            entries.push(entry);
          }
        }

        if (entries.length === 0) {
          setImportError('No valid entries found. Ensure file has LCP and Splitter columns.');
          return;
        }

        setImportPreview(entries);
      } catch (err) {
        setImportError('Failed to parse file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    const entriesToImport = importPreview.map(entry => ({
      lcp_number: entry.lcpNumber || '',
      splitter_number: entry.splitterNumber || '',
      location: entry.physicalLocation || '',
      gps_lat: entry.latitude ? parseFloat(entry.latitude) : null,
      gps_lng: entry.longitude ? parseFloat(entry.longitude) : null,
      olt_shelf: entry.oltShelf || '',
      olt_slot: entry.oltSlot || '',
      olt_port: entry.oltPort || '',
      optic_make: entry.opticMake || '',
      optic_model: entry.opticModel || '',
      optic_serial: entry.opticSerial || '',
      notes: entry.notes || '',
    }));
    bulkCreateMutation.mutate(entriesToImport);
  };

  const downloadTemplate = () => {
    const template = 'LCP,Splitter,Location,Latitude,Longitude,OLT,Shelf,Slot,Port,Optic_Make,Optic_Model,Optic_Serial,Notes\nLCP-001,SPL-001,"123 Main St",40.7128,-74.0060,OLT-01,0,1,1-4,Finisar,FTLX1475D3BCL,ABC123,Sample entry';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lcp_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredEntries = lcpEntries.filter(entry => {
    const term = searchTerm.toLowerCase();
    return (
      (entry.lcp_number || '').toLowerCase().includes(term) ||
      (entry.splitter_number || '').toLowerCase().includes(term) ||
      (entry.location || '').toLowerCase().includes(term) ||
      `${entry.olt_shelf}/${entry.olt_slot}/${entry.olt_port}`.includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">LCP / CLCP Info</h1>
                <p className="text-xs text-gray-500">Cabinet & Splitter Reference</p>
              </div>
            </div>
            <div className="flex gap-2">
              {entriesWithCoords.length > 0 && (
                <Link to={createPageUrl('LCPMap')}>
                  <Button variant="outline">
                    <Map className="h-4 w-4 mr-2" />
                    Map View
                  </Button>
                </Link>
              )}
              <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add LCP
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit LCP Entry' : 'Add New LCP Entry'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>LCP/CLCP Number *</Label>
                      <Input
                        placeholder="e.g., LCP-001"
                        value={formData.lcpNumber}
                        onChange={(e) => setFormData({ ...formData, lcpNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Splitter Number *</Label>
                      <Input
                        placeholder="e.g., SPL-001"
                        value={formData.splitterNumber}
                        onChange={(e) => setFormData({ ...formData, splitterNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Physical Location</Label>
                    <Input
                      placeholder="e.g., 123 Main St, Pole #45"
                      value={formData.physicalLocation}
                      onChange={(e) => setFormData({ ...formData, physicalLocation: e.target.value })}
                    />
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">GPS Coordinates (Optional)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation}>
                        <Navigation className="h-3 w-3 mr-1" />
                        Get Current
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Latitude</Label>
                        <Input
                          placeholder="e.g., 40.7128"
                          value={formData.latitude}
                          onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Longitude</Label>
                        <Input
                          placeholder="e.g., -74.0060"
                          value={formData.longitude}
                          onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                    <Label className="text-sm font-medium">OLT Location (Logical)</Label>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">OLT</Label>
                        <Input
                          placeholder="OLT-01"
                          value={formData.oltName}
                          onChange={(e) => setFormData({ ...formData, oltName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Shelf</Label>
                        <Input
                          placeholder="0"
                          value={formData.oltShelf}
                          onChange={(e) => setFormData({ ...formData, oltShelf: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Slot</Label>
                        <Input
                          placeholder="1"
                          value={formData.oltSlot}
                          onChange={(e) => setFormData({ ...formData, oltSlot: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Port(s)</Label>
                        <Input
                          placeholder="1-4"
                          value={formData.oltPort}
                          onChange={(e) => setFormData({ ...formData, oltPort: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                    <Label className="text-sm font-medium">Optic Information (Optional)</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Make</Label>
                        <Input
                          placeholder="e.g., Finisar"
                          value={formData.opticMake}
                          onChange={(e) => setFormData({ ...formData, opticMake: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Model</Label>
                        <Input
                          placeholder="e.g., FTLX1475D3BCL"
                          value={formData.opticModel}
                          onChange={(e) => setFormData({ ...formData, opticModel: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Serial Number</Label>
                      <Input
                        placeholder="Optic serial number"
                        value={formData.opticSerial}
                        onChange={(e) => setFormData({ ...formData, opticSerial: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      placeholder="Additional notes..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      {editingId ? 'Update' : 'Save'}
                    </Button>
                  </div>
                </div>
                </DialogContent>
              </Dialog>

              {/* Import Dialog */}
              <Dialog open={showImportDialog} onOpenChange={(open) => { setShowImportDialog(open); if (!open) { setImportPreview([]); setImportError(''); } }}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Import LCP Entries</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
                        <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Supported formats: CSV or TXT (tab/comma separated)</p>
                          <p className="mt-1">Required columns: LCP, Splitter</p>
                          <p>Optional: Location, OLT, Shelf, Slot, Port, Optic_Make, Optic_Model, Optic_Serial, Notes</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={downloadTemplate}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Template
                      </Button>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload CSV or TXT file</p>
                      </label>
                    </div>

                    {importError && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300">
                        {importError}
                      </div>
                    )}

                    {importPreview.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">Preview ({importPreview.length} entries)</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>LCP</TableHead>
                                <TableHead>Splitter</TableHead>
                                <TableHead>Location</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importPreview.slice(0, 10).map((entry, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-mono text-sm">{entry.lcpNumber || '-'}</TableCell>
                                  <TableCell className="font-mono text-sm">{entry.splitterNumber || '-'}</TableCell>
                                  <TableCell className="text-sm truncate max-w-[150px]">{entry.physicalLocation || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {importPreview.length > 10 && (
                            <div className="text-center py-2 text-sm text-gray-500">
                              ... and {importPreview.length - 10} more
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => { setImportPreview([]); setImportError(''); }} className="flex-1">
                            Cancel
                          </Button>
                          <Button onClick={confirmImport} className="flex-1">
                            Import {importPreview.length} Entries
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by LCP number, splitter, location, or OLT..."
            className="pl-10 h-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Results */}
        {isLoading ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-600">Loading entries...</h3>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <CloudOff className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">Failed to load entries</h3>
              <p className="text-sm text-gray-500 mt-1">Please check your connection and try again</p>
            </CardContent>
          </Card>
        ) : filteredEntries.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <Cable className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">
                {lcpEntries.length === 0 ? 'No LCP entries yet' : 'No matching entries'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {lcpEntries.length === 0 
                  ? 'Click "Add LCP" to create your first entry'
                  : 'Try a different search term'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <Card key={entry.id} className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge className="bg-indigo-600 text-lg px-3 py-1">{entry.lcp_number}</Badge>
                        <Badge variant="outline" className="font-mono">{entry.splitter_number}</Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        {entry.location && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-xs text-gray-500">Physical Location</div>
                              <div className="text-sm">{entry.location}</div>
                              {entry.gps_lat && entry.gps_lng && (
                                <div className="text-xs text-blue-600 font-mono mt-0.5">
                                  📍 {entry.gps_lat}, {entry.gps_lng}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {(entry.olt_shelf || entry.olt_slot || entry.olt_port) && (
                          <div className="flex items-start gap-2">
                            <Server className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-xs text-gray-500">OLT Location</div>
                              <div className="text-sm font-mono">
                                Shelf {entry.olt_shelf || '-'} / Slot {entry.olt_slot || '-'} / Port {entry.olt_port || '-'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {(entry.optic_make || entry.optic_model || entry.optic_serial) && (
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">Optic Info</div>
                          <div className="text-sm">
                            {[entry.optic_make, entry.optic_model].filter(Boolean).join(' ')}
                            {entry.optic_serial && <span className="text-gray-500 ml-2">S/N: {entry.optic_serial}</span>}
                          </div>
                        </div>
                      )}

                      {entry.notes && (
                        <div className="text-sm text-gray-500 italic">{entry.notes}</div>
                      )}
                    </div>

                    <div className="flex gap-1 ml-4">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)} disabled={updateMutation.isPending}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(entry.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center text-xs text-gray-400 py-4 flex items-center justify-center gap-2">
          <Cloud className="h-3 w-3" />
          {lcpEntries.length} total entries • Synced to cloud database
        </div>
      </main>
    </div>
  );
}