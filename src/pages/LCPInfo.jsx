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
  Info,
  ArrowUpDown
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserPreferences } from '@/components/UserPreferencesContext';

export default function LCPInfo() {
  const queryClient = useQueryClient();
  const { preferences } = useUserPreferences();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'table'
  const [sortBy, setSortBy] = useState(preferences.defaultSortBy === 'job_number' ? 'lcp_number' : preferences.defaultSortBy || 'created_date');
  const [sortOrder, setSortOrder] = useState(preferences.defaultSortOrder || 'desc');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importError, setImportError] = useState('');
  const [importWarnings, setImportWarnings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [formData, setFormData] = useState({
    entryType: 'LCP',
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

  // Bulk delete mutation - parallel deletion for speed
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.LCPEntry.delete(id)));
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['lcpEntries'] });
      toast.success(`Deleted ${ids.length} entries`);
      setSelectedIds([]);
      setSelectionMode(false);
    },
    onError: () => toast.error('Failed to delete some entries'),
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
      entryType: 'LCP',
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
      olt_name: formData.oltName,
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
    // Detect if it's CLCP based on lcp_number prefix
    const isClcp = entry.lcp_number?.toUpperCase().startsWith('CLCP');
    setFormData({
      entryType: isClcp ? 'CLCP' : 'LCP',
      lcpNumber: entry.lcp_number || '',
      splitterNumber: entry.splitter_number || '',
      physicalLocation: entry.location || '',
      latitude: entry.gps_lat?.toString() || '',
      longitude: entry.gps_lng?.toString() || '',
      oltName: entry.olt_name || '',
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

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEntries.map(e => e.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} entries? This cannot be undone.`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  // Convert DMS (Degrees Minutes Seconds) to decimal degrees
  // Supports formats like: 42°28'40.25"N, 42°28'40.25", 42 28 40.25 N, etc.
  const parseDMSToDecimal = (dmsString) => {
    if (!dmsString) return null;
    
    const str = dmsString.toString().trim();
    
    // If it's already a decimal number, return it
    const simpleNum = parseFloat(str);
    if (!isNaN(simpleNum) && !str.includes('°') && !str.includes("'") && !str.includes('"') && Math.abs(simpleNum) <= 180) {
      return simpleNum;
    }
    
    // Check for direction indicator (N, S, E, W)
    const directionMatch = str.match(/[NSEW]/i);
    const direction = directionMatch ? directionMatch[0].toUpperCase() : null;
    
    // Try to parse DMS format
    // Patterns: 42°28'40.25"N, 42°28'40.25", 42 28 40.25, 42-28-40.25
    const dmsRegex = /(-?\d+)[°\s\-]+(\d+)['\s\-]+(\d+\.?\d*)["\s]*/;
    const match = str.match(dmsRegex);
    
    if (match) {
      const degrees = parseFloat(match[1]);
      const minutes = parseFloat(match[2]);
      const seconds = parseFloat(match[3]);
      
      let decimal = Math.abs(degrees) + (minutes / 60) + (seconds / 3600);
      
      // Apply negative for S or W directions, or if original degrees were negative
      if (direction === 'S' || direction === 'W' || degrees < 0) {
        decimal = -decimal;
      }
      
      return parseFloat(decimal.toFixed(6));
    }
    
    // Try degrees and decimal minutes format: 42°28.671'N or 42 28.671
    const dmRegex = /(-?\d+)[°\s\-]+(\d+\.?\d*)['\s]*/;
    const dmMatch = str.match(dmRegex);
    
    if (dmMatch) {
      const degrees = parseFloat(dmMatch[1]);
      const minutes = parseFloat(dmMatch[2]);
      
      let decimal = Math.abs(degrees) + (minutes / 60);
      
      if (direction === 'S' || direction === 'W' || degrees < 0) {
        decimal = -decimal;
      }
      
      return parseFloat(decimal.toFixed(6));
    }
    
    return null;
  };

  // Parse CSV with proper quote handling
  const parseCSVLine = (line, delimiter) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    
    // Check for unsupported file types
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      setImportError('Excel files (.xlsx/.xls) are not directly supported. Please save your Excel file as CSV first (File → Save As → CSV).');
      return;
    }

    if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
      setImportError('Please upload a CSV or TXT file. For Excel files, save as CSV first.');
      return;
    }

    setImportError('');
    setImportPreview([]);
    setImportWarnings([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      try {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) {
          setImportError('File must have a header row and at least one data row');
          return;
        }

        // Detect delimiter
        const firstLine = lines[0];
        let delimiter = ',';
        if (firstLine.includes('\t')) delimiter = '\t';
        else if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) delimiter = ';';

        // Parse header
        const headers = parseCSVLine(firstLine, delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        
        // Map common header variations - Updated to match user specification
        const headerMap = {
          // TYPE column - LCP or CLCP
          'type': 'entryType',
          // LCP = LCP or CLCP number
          'lcp': 'lcpNumber', 'lcp_number': 'lcpNumber', 'lcpnumber': 'lcpNumber', 'lcp number': 'lcpNumber', 'clcp': 'lcpNumber', 'clcp_number': 'lcpNumber',
          // SPLITTER = splitter number
          'splitter': 'splitterNumber', 'splitter_number': 'splitterNumber', 'splitternumber': 'splitterNumber', 'splitter number': 'splitterNumber',
          // LOCATION = physical location
          'location': 'physicalLocation', 'physical_location': 'physicalLocation', 'address': 'physicalLocation',
          // LAT = gps latitude (all formats)
          'lat': 'latitude', 'latitude': 'latitude', 'gps_lat': 'latitude',
          // LONG = gps longitude (all formats)
          'long': 'longitude', 'longitude': 'longitude', 'lon': 'longitude', 'lng': 'longitude', 'gps_lon': 'longitude', 'gps_lng': 'longitude',
          // OLT = OLT name
          'olt': 'oltName', 'olt_name': 'oltName', 'oltname': 'oltName',
          // SHELF = shelf number
          'shelf': 'oltShelf', 'olt_shelf': 'oltShelf',
          // SLOT = slot/card number
          'slot': 'oltSlot', 'olt_slot': 'oltSlot', 'card': 'oltSlot',
          // PORT = PON port
          'port': 'oltPort', 'olt_port': 'oltPort', 'ports': 'oltPort', 'pon_port': 'oltPort',
          // Optional: optic info
          'optic_make': 'opticMake', 'opticmake': 'opticMake', 'optic-make': 'opticMake', 'make': 'opticMake',
          'optic_model': 'opticModel', 'opticmodel': 'opticModel', 'optic-model': 'opticModel', 'model': 'opticModel',
          'optic_serial': 'opticSerial', 'opticserial': 'opticSerial', 'optic-serial': 'opticSerial', 'serial': 'opticSerial',
          // Notes
          'notes': 'notes', 'note': 'notes', 'comments': 'notes'
        };

        const mappedHeaders = headers.map(h => headerMap[h] || h);
        
        // Check if we have required columns
        const hasLcp = mappedHeaders.includes('lcpNumber');
        const hasSplitter = mappedHeaders.includes('splitterNumber');
        if (!hasLcp && !hasSplitter) {
          setImportError(`Could not find LCP or Splitter columns. Found headers: ${headers.join(', ')}`);
          return;
        }

        // Parse data rows
        const entries = [];
        const warnings = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          try {
            const values = parseCSVLine(line, delimiter);
            
            // Check for malformed row
            if (values.length < 2) {
              warnings.push({ row: i + 1, message: 'Row has fewer than 2 columns, skipped' });
              continue;
            }

            const entry = { id: Date.now() + i, _rowNum: i + 1 };
            mappedHeaders.forEach((header, idx) => {
              if (values[idx] !== undefined && values[idx] !== '') {
                entry[header] = values[idx].replace(/^["']|["']$/g, '');
              }
            });

            // Validate required fields
            if (!entry.lcpNumber && !entry.splitterNumber) {
              warnings.push({ row: i + 1, message: 'Missing both LCP and Splitter values, skipped' });
              continue;
            }

            // Convert DMS coordinates to decimal if present
            if (entry.latitude) {
              const parsedLat = parseDMSToDecimal(entry.latitude);
              if (parsedLat !== null) {
                entry._latOriginal = entry.latitude;
                entry.latitude = parsedLat.toString();
              } else if (isNaN(parseFloat(entry.latitude))) {
                warnings.push({ row: i + 1, message: `Invalid latitude format: ${entry.latitude}` });
                entry.latitude = '';
              }
            }
            if (entry.longitude) {
              const parsedLng = parseDMSToDecimal(entry.longitude);
              if (parsedLng !== null) {
                entry._lngOriginal = entry.longitude;
                entry.longitude = parsedLng.toString();
              } else if (isNaN(parseFloat(entry.longitude))) {
                warnings.push({ row: i + 1, message: `Invalid longitude format: ${entry.longitude}` });
                entry.longitude = '';
              }
            }

            entries.push(entry);
          } catch (rowErr) {
            warnings.push({ row: i + 1, message: `Failed to parse row: ${rowErr.message}` });
          }
        }

        if (entries.length === 0) {
          setImportError('No valid entries found. Ensure file has LCP and Splitter columns with data.');
          return;
        }

        setImportPreview(entries);
        setImportWarnings(warnings);
      } catch (err) {
        setImportError(`Failed to parse file: ${err.message}`);
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read file. Please try again.');
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
      olt_name: entry.oltName || '',
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
    const template = 'Type,LCP,Splitter,Location,Lat,Long,OLT,Shelf,Slot,Port,Optic-Make,Optic-Model,Optic-Serial,Notes\nLCP,LCP-001,SPL-001,"123 Main St",40.7128,-74.0060,OLT-01,0,1,1-4,Finisar,FTLX1475D3BCL,ABC123,Sample entry\nCLCP,CLCP-002,SPL-002,"456 Oak Ave",40.7200,-74.0100,OLT-02,0,2,5-8,,,,Second sample';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lcp_clcp_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (lcpEntries.length === 0) {
      toast.error('No entries to export');
      return;
    }

    const headers = ['Type', 'LCP', 'Splitter', 'Location', 'Lat', 'Long', 'OLT', 'Shelf', 'Slot', 'Port', 'Optic-Make', 'Optic-Model', 'Optic-Serial', 'Notes'];
    const rows = lcpEntries.map(entry => {
      // Determine type from lcp_number prefix
      const entryType = (entry.lcp_number || '').toUpperCase().startsWith('CLCP') ? 'CLCP' : 'LCP';
      return [
        entryType,
        entry.lcp_number || '',
        entry.splitter_number || '',
        entry.location || '',
        entry.gps_lat || '',
        entry.gps_lng || '',
        entry.olt_name || '',
        entry.olt_shelf || '',
        entry.olt_slot || '',
        entry.olt_port || '',
        entry.optic_make || '',
        entry.optic_model || '',
        entry.optic_serial || '',
        entry.notes || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lcp_entries_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${lcpEntries.length} entries`);
  };

  const filteredEntries = lcpEntries
    .filter(entry => {
      const term = searchTerm.toLowerCase();
      return (
        (entry.lcp_number || '').toLowerCase().includes(term) ||
        (entry.splitter_number || '').toLowerCase().includes(term) ||
        (entry.location || '').toLowerCase().includes(term) ||
        `${entry.olt_shelf}/${entry.olt_slot}/${entry.olt_port}`.includes(term)
      );
    })
    .sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'lcp_number') {
        aVal = (a.lcp_number || '').toLowerCase();
        bVal = (b.lcp_number || '').toLowerCase();
      } else if (sortBy === 'location') {
        aVal = (a.location || '').toLowerCase();
        bVal = (b.location || '').toLowerCase();
      } else {
        aVal = a.created_date || '';
        bVal = b.created_date || '';
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
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
              {selectionMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {selectedIds.length === filteredEntries.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleBulkDelete}
                    disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete ({selectedIds.length})
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectionMode(false); setSelectedIds([]); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  {lcpEntries.length > 0 && (
                    <Button variant="outline" onClick={() => setSelectionMode(true)}>
                      Select
                    </Button>
                  )}
                  <Link to={createPageUrl('LCPMap')}>
                    <Button variant="outline" className="relative">
                      <Map className="h-4 w-4 mr-2" />
                      Map View
                      {entriesWithCoords.length === 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full" title="Add GPS coordinates to use map view" />
                      )}
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                  <Button variant="outline" onClick={exportToCSV} disabled={lcpEntries.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </>
              )}
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
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Type *</Label>
                      <Select value={formData.entryType} onValueChange={(value) => setFormData({ ...formData, entryType: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LCP">LCP</SelectItem>
                          <SelectItem value="CLCP">CLCP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{formData.entryType} Number *</Label>
                      <Input
                        placeholder={`e.g., ${formData.entryType}-001`}
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
              <Dialog open={showImportDialog} onOpenChange={(open) => { setShowImportDialog(open); if (!open) { setImportPreview([]); setImportError(''); setImportWarnings([]); } }}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Import LCP Entries</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
                        <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Supported formats: CSV or TXT (comma, tab, or semicolon separated)</p>
                          <p className="mt-2 font-medium">Column names:</p>
                          <ul className="text-xs mt-1 space-y-0.5">
                            <li><strong>Type</strong> – LCP or CLCP (optional)</li>
                            <li><strong>LCP</strong> – LCP/CLCP number *</li>
                            <li><strong>Splitter</strong> – Splitter number *</li>
                            <li><strong>Location</strong> – Physical location</li>
                            <li><strong>Lat</strong> – GPS latitude (decimal or DMS)</li>
                            <li><strong>Long</strong> – GPS longitude (decimal or DMS)</li>
                            <li><strong>OLT</strong> – OLT name</li>
                            <li><strong>Shelf, Slot, Port</strong> – OLT location</li>
                            <li><strong>Optic-Make, Optic-Model, Optic-Serial, Notes</strong> – Optional</li>
                          </ul>
                          <p className="mt-1 text-xs text-blue-600">💡 Coordinates: decimal (40.7128) or DMS (42°28'40.25"N)</p>
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
                        <p className="text-xs text-gray-400 mt-1">For Excel files, save as CSV first</p>
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
                        <div className="max-h-64 overflow-y-auto border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>LCP/CLCP</TableHead>
                                <TableHead>Splitter</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>OLT</TableHead>
                                <TableHead>Coordinates</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importPreview.slice(0, 10).map((entry, i) => (
                                <TableRow key={i}>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {entry.entryType || (entry.lcpNumber?.toUpperCase().startsWith('CLCP') ? 'CLCP' : 'LCP')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{entry.lcpNumber || '-'}</TableCell>
                                  <TableCell className="font-mono text-sm">{entry.splitterNumber || '-'}</TableCell>
                                  <TableCell className="text-sm truncate max-w-[100px]">{entry.physicalLocation || '-'}</TableCell>
                                  <TableCell className="text-xs font-mono">
                                    {entry.oltName ? (
                                      <div>
                                        <div>{entry.oltName}</div>
                                        {(entry.oltShelf || entry.oltSlot || entry.oltPort) && (
                                          <div className="text-gray-500">{entry.oltShelf || '-'}/{entry.oltSlot || '-'}/{entry.oltPort || '-'}</div>
                                        )}
                                      </div>
                                    ) : '-'}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {entry.latitude && entry.longitude ? (
                                      <div>
                                        <div className="font-mono text-green-600">{entry.latitude}, {entry.longitude}</div>
                                        {(entry._latOriginal || entry._lngOriginal) && 
                                         (entry._latOriginal !== entry.latitude || entry._lngOriginal !== entry.longitude) && (
                                          <div className="text-gray-400 text-[10px]">
                                            from: {entry._latOriginal}, {entry._lngOriginal}
                                          </div>
                                        )}
                                      </div>
                                    ) : '-'}
                                  </TableCell>
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
                        
                        {/* Coordinate conversion notice */}
                        {importPreview.some(e => e._latOriginal || e._lngOriginal) && (
                          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-xs text-green-700 dark:text-green-300 flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            DMS coordinates (like 42°28'40.25"N) have been converted to decimal format
                          </div>
                        )}
                        
                        {/* Import warnings */}
                        {importWarnings.length > 0 && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                              <Info className="h-4 w-4" />
                              {importWarnings.length} row(s) had issues
                            </div>
                            <div className="max-h-24 overflow-y-auto text-xs text-amber-700 dark:text-amber-300 space-y-1">
                              {importWarnings.slice(0, 5).map((w, i) => (
                                <div key={i}>Row {w.row}: {w.message}</div>
                              ))}
                              {importWarnings.length > 5 && (
                                <div className="text-amber-600">... and {importWarnings.length - 5} more</div>
                              )}
                            </div>
                          </div>
                        )}
                        
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
        {/* Map View Notice */}
        {entriesWithCoords.length === 0 && lcpEntries.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Map view available:</strong> Add GPS coordinates to your entries to view them on an interactive map.
            </p>
          </div>
        )}

        {/* Search, Sort, and View Toggle */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by LCP number, splitter, location, or OLT..."
              className="pl-10 h-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(val) => {
              const [field, order] = val.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}>
              <SelectTrigger className="w-[160px] h-12">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date-desc">Newest First</SelectItem>
                <SelectItem value="created_date-asc">Oldest First</SelectItem>
                <SelectItem value="lcp_number-asc">LCP # (A-Z)</SelectItem>
                <SelectItem value="lcp_number-desc">LCP # (Z-A)</SelectItem>
                <SelectItem value="location-asc">Location (A-Z)</SelectItem>
                <SelectItem value="location-desc">Location (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex border rounded-lg overflow-hidden">
            <Button 
              variant={viewMode === 'list' ? 'default' : 'ghost'} 
              size="icon" 
              className="rounded-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'table' ? 'default' : 'ghost'} 
              size="icon" 
              className="rounded-none"
              onClick={() => setViewMode('table')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
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
        ) : viewMode === 'table' ? (
          /* Table View */
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800">
                    {selectionMode && <TableHead className="w-10"></TableHead>}
                    <TableHead>LCP/CLCP</TableHead>
                    <TableHead>Splitter</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>OLT (Shelf/Slot/Port)</TableHead>
                    <TableHead>GPS</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className={selectedIds.includes(entry.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                      {selectionMode && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(entry.id)}
                            onChange={() => toggleSelect(entry.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge className="bg-indigo-600">{entry.lcp_number}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{entry.splitter_number}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{entry.location || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.olt_name || entry.olt_shelf || entry.olt_slot || entry.olt_port 
                          ? `${entry.olt_name ? entry.olt_name + ' ' : ''}${entry.olt_shelf || '-'}/${entry.olt_slot || '-'}/${entry.olt_port || '-'}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {entry.gps_lat && entry.gps_lng ? (
                          <Badge variant="outline" className="text-xs">📍</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(entry)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(entry.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          /* List View */
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <Card key={entry.id} className={`border-0 shadow-lg ${selectedIds.includes(entry.id) ? 'ring-2 ring-blue-500' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    {selectionMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(entry.id)}
                        onChange={() => toggleSelect(entry.id)}
                        className="h-5 w-5 rounded border-gray-300 mr-3 mt-1"
                      />
                    )}
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge className="bg-indigo-600 text-lg px-3 py-1">{entry.lcp_number}</Badge>
                        <Badge variant="outline" className="font-mono">{entry.splitter_number}</Badge>
                        {entry.gps_lat && entry.gps_lng && (
                          <Badge variant="outline" className="text-xs text-blue-600">📍 Has GPS</Badge>
                        )}
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
                                  {entry.gps_lat}, {entry.gps_lng}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {(entry.olt_name || entry.olt_shelf || entry.olt_slot || entry.olt_port) && (
                          <div className="flex items-start gap-2">
                            <Server className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-xs text-gray-500">OLT Location</div>
                              <div className="text-sm font-mono">
                                {entry.olt_name && <span className="font-semibold">{entry.olt_name} </span>}
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