import React, { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserPreferences } from '@/components/UserPreferencesContext';
import OpticInventoryUpload from '@/components/lcp/OpticInventoryUpload';
import LCPEntryForm from '@/components/lcp/LCPEntryForm';
import LCPImportDialog from '@/components/lcp/LCPImportDialog';
import LCPTableView from '@/components/lcp/LCPTableView';
import LCPListView from '@/components/lcp/LCPListView';
import LCPAdvancedFilters from '@/components/lcp/LCPAdvancedFilters';
import {
  ArrowLeft, Plus, Search, Trash2, X, Cable, Upload, Download, Map,
  Loader2, CloudOff, Cloud, List, LayoutGrid, Info, ArrowUpDown, Server
} from 'lucide-react';

const INITIAL_FORM = {
  entryType: 'LCP', lcpNumber: '', splitterNumber: '', physicalLocation: '',
  latitude: '', longitude: '', oltName: '', oltShelf: '', oltSlot: '', oltPort: '',
  opticMake: '', opticModel: '', opticSerial: '', notes: ''
};

export default function LCPInfo() {
  const queryClient = useQueryClient();
  const { preferences } = useUserPreferences();
  const [filters, setFilters] = useState({
    searchTerm: '', oltName: 'all', opticMake: 'all', opticModel: 'all',
    opticType: 'all', hasGps: 'all',
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [sortBy, setSortBy] = useState('lcp_number');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importError, setImportError] = useState('');
  const [importWarnings, setImportWarnings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showOpticImport, setShowOpticImport] = useState(false);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });

  const { data: lcpEntries = [], isLoading, error } = useQuery({
    queryKey: ['lcpEntries'],
    queryFn: () => base44.entities.LCPEntry.list('-created_date', 5000),
  });

  const { data: latestLcpCountData = null, isLoading: isLoadingLatestCounts } = useQuery({
    queryKey: ['latestPonPmOntCounts'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getLatestLcpOntCounts', {});
      return response.data || null;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LCPEntry.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lcpEntries'] }); toast.success('LCP entry added'); resetForm(); setShowAddDialog(false); },
    onError: () => toast.error('Failed to save entry'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LCPEntry.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lcpEntries'] }); toast.success('LCP entry updated'); resetForm(); setShowAddDialog(false); },
    onError: () => toast.error('Failed to update entry'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LCPEntry.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lcpEntries'] }); toast.success('LCP entry deleted'); },
    onError: () => toast.error('Failed to delete entry'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      const chunkSize = 10;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        await Promise.all(chunk.map(id => base44.entities.LCPEntry.delete(id)));
      }
    },
    onSuccess: (_, ids) => { queryClient.invalidateQueries({ queryKey: ['lcpEntries'] }); toast.success(`Deleted ${ids.length} entries`); setSelectedIds([]); setSelectionMode(false); },
    onError: () => { queryClient.invalidateQueries({ queryKey: ['lcpEntries'] }); toast.error('Some entries may not have been deleted.'); },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (entries) => base44.entities.LCPEntry.bulkCreate(entries),
    onSuccess: (_, variables) => { queryClient.invalidateQueries({ queryKey: ['lcpEntries'] }); toast.success(`Imported ${variables.length} entries`); setShowImportDialog(false); setImportPreview([]); setImportError(''); },
    onError: () => toast.error('Failed to import entries'),
  });

  const resetForm = () => { setFormData({ ...INITIAL_FORM }); setEditingId(null); };

  const latestOntCountsByKey = useMemo(() => latestLcpCountData?.counts || {}, [latestLcpCountData]);
  const entriesWithCoords = lcpEntries.filter(e => e.gps_lat && e.gps_lng);

  // --- Validation helpers ---
  const validateField = (value, label, required = false) => {
    if (!value || !value.trim()) return required ? `${label} is required` : null;
    const pattern = /^[A-Z0-9][A-Z0-9\-_\s]{0,30}$/i;
    if (!pattern.test(value.trim())) return `${label} format invalid`;
    return null;
  };

  const handleSubmit = () => {
    const lcpErr = validateField(formData.lcpNumber, `${formData.entryType} Number`, true);
    if (lcpErr) { toast.error(lcpErr); return; }
    const splErr = validateField(formData.splitterNumber, 'Splitter Number', true);
    if (splErr) { toast.error(splErr); return; }

    // GPS validation
    if (formData.latitude || formData.longitude) {
      if (!formData.latitude || !formData.longitude) { toast.error('Both latitude and longitude required'); return; }
      const lat = parseFloat(formData.latitude), lng = parseFloat(formData.longitude);
      if (isNaN(lat) || lat < -90 || lat > 90) { toast.error('Invalid latitude'); return; }
      if (isNaN(lng) || lng < -180 || lng > 180) { toast.error('Invalid longitude'); return; }
    }

    // Duplicate check
    const dup = lcpEntries.find(e => {
      if (editingId && e.id === editingId) return false;
      return (e.lcp_number || '').toUpperCase() === formData.lcpNumber.trim().toUpperCase() &&
             (e.splitter_number || '').toUpperCase() === formData.splitterNumber.trim().toUpperCase();
    });
    if (dup) { toast.error(`Entry ${formData.lcpNumber} / ${formData.splitterNumber} already exists`); return; }

    const entryData = {
      lcp_number: formData.lcpNumber.trim(), splitter_number: formData.splitterNumber.trim(),
      location: formData.physicalLocation?.trim() || '',
      gps_lat: formData.latitude ? parseFloat(formData.latitude) : null,
      gps_lng: formData.longitude ? parseFloat(formData.longitude) : null,
      olt_name: formData.oltName?.trim() || '', olt_shelf: formData.oltShelf?.trim() || '',
      olt_slot: formData.oltSlot?.trim() || '', olt_port: formData.oltPort?.trim() || '',
      optic_make: formData.opticMake?.trim() || '', optic_model: formData.opticModel?.trim() || '',
      optic_serial: formData.opticSerial?.trim() || '', notes: formData.notes?.trim() || '',
    };
    editingId ? updateMutation.mutate({ id: editingId, data: entryData }) : createMutation.mutate(entryData);
  };

  const handleEdit = (entry) => {
    const isClcp = entry.lcp_number?.toUpperCase().startsWith('CLCP');
    setFormData({
      entryType: isClcp ? 'CLCP' : 'LCP', lcpNumber: entry.lcp_number || '',
      splitterNumber: entry.splitter_number || '', physicalLocation: entry.location || '',
      latitude: entry.gps_lat?.toString() || '', longitude: entry.gps_lng?.toString() || '',
      oltName: entry.olt_name || '', oltShelf: entry.olt_shelf || '', oltSlot: entry.olt_slot || '',
      oltPort: entry.olt_port || '', opticMake: entry.optic_make || '', opticModel: entry.optic_model || '',
      opticSerial: entry.optic_serial || '', notes: entry.notes || ''
    });
    setEditingId(entry.id); setShowAddDialog(true);
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === filteredEntries.length ? [] : filteredEntries.map(e => e.id));
  const handleBulkDelete = () => { if (selectedIds.length && confirm(`Delete ${selectedIds.length} entries?`)) bulkDeleteMutation.mutate(selectedIds); };

  const handleColumnSort = (field) => {
    if (sortBy === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  // --- CSV Import Logic ---
  const parseCSVLine = (line, delimiter) => {
    const result = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') { if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } else inQuotes = !inQuotes; }
      else if (char === delimiter && !inQuotes) { result.push(current.trim()); current = ''; }
      else current += char;
    }
    result.push(current.trim()); return result;
  };

  const parseGpsCoordinate = (value) => {
    if (!value) return null;
    const str = value.toString().trim();
    const num = parseFloat(str);
    if (!isNaN(num) && /^-?\d+\.?\d*$/.test(str)) return num;
    const dirMatch = str.match(/[NSEW]/i);
    const dir = dirMatch ? dirMatch[0].toUpperCase() : null;
    const numStr = str.replace(/[NSEW]/gi, '').trim();
    const dms = numStr.match(/(-?\d+)[°\s\-]+(\d+)['\s\-]+(\d+\.?\d*)/);
    if (dms) { let d = Math.abs(parseFloat(dms[1])) + parseFloat(dms[2])/60 + parseFloat(dms[3])/3600; if (dir==='S'||dir==='W'||dms[1].startsWith('-')) d=-d; return parseFloat(d.toFixed(6)); }
    const dm = numStr.match(/(-?\d+)[°\s\-]+(\d+\.?\d*)/);
    if (dm) { let d = Math.abs(parseFloat(dm[1])) + parseFloat(dm[2])/60; if (dir==='S'||dir==='W'||dm[1].startsWith('-')) d=-d; return parseFloat(d.toFixed(6)); }
    return null;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fn = file.name.toLowerCase();
    if (fn.endsWith('.xlsx') || fn.endsWith('.xls')) { setImportError('Excel not supported. Save as CSV first.'); return; }
    if (!fn.endsWith('.csv') && !fn.endsWith('.txt')) { setImportError('Please upload CSV or TXT.'); return; }
    setImportError(''); setImportPreview([]); setImportWarnings([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setImportError('Need header + data'); return; }
      const fl = lines[0]; let delim = ',';
      if (fl.includes('\t')) delim = '\t';
      else if ((fl.match(/;/g)||[]).length > (fl.match(/,/g)||[]).length) delim = ';';
      const headers = parseCSVLine(fl, delim).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      const hMap = { 'type':'entryType','lcp':'lcpNumber','lcp_number':'lcpNumber','lcpnumber':'lcpNumber','clcp':'lcpNumber','splitter':'splitterNumber','splitter_number':'splitterNumber','splitternumber':'splitterNumber','location':'physicalLocation','physical_location':'physicalLocation','address':'physicalLocation','lat':'latitude','latitude':'latitude','gps_lat':'latitude','long':'longitude','longitude':'longitude','lon':'longitude','lng':'longitude','gps_lng':'longitude','olt':'oltName','olt_name':'oltName','shelf':'oltShelf','olt_shelf':'oltShelf','slot':'oltSlot','olt_slot':'oltSlot','card':'oltSlot','port':'oltPort','olt_port':'oltPort','pon_port':'oltPort','optic_make':'opticMake','make':'opticMake','optic_model':'opticModel','model':'opticModel','optic_serial':'opticSerial','serial':'opticSerial','notes':'notes','note':'notes','comments':'notes' };
      const mapped = headers.map(h => hMap[h] || h);
      if (!mapped.includes('lcpNumber') && !mapped.includes('splitterNumber')) { setImportError(`No LCP/Splitter columns. Found: ${headers.join(', ')}`); return; }
      const entries = [], warnings = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLine(lines[i].trim(), delim);
        if (vals.length < 2) continue;
        const entry = { id: Date.now()+i, _rowNum: i+1 };
        mapped.forEach((h, idx) => { if (vals[idx]) entry[h] = vals[idx].replace(/^["']|["']$/g, ''); });
        if (!entry.lcpNumber && !entry.splitterNumber) continue;
        if (entry.latitude) { const p = parseGpsCoordinate(entry.latitude); if (p!==null) entry.latitude=p.toString(); else { warnings.push({row:i+1,message:`Invalid lat`}); entry.latitude=''; } }
        if (entry.longitude) { const p = parseGpsCoordinate(entry.longitude); if (p!==null) entry.longitude=p.toString(); else { warnings.push({row:i+1,message:`Invalid lng`}); entry.longitude=''; } }
        entries.push(entry);
      }
      if (!entries.length) { setImportError('No valid entries found'); return; }
      setImportPreview(entries); setImportWarnings(warnings);
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    bulkCreateMutation.mutate(importPreview.map(e => ({
      lcp_number: e.lcpNumber||'', splitter_number: e.splitterNumber||'', location: e.physicalLocation||'',
      gps_lat: e.latitude ? parseFloat(e.latitude) : null, gps_lng: e.longitude ? parseFloat(e.longitude) : null,
      olt_name: e.oltName||'', olt_shelf: e.oltShelf||'', olt_slot: e.oltSlot||'', olt_port: e.oltPort||'',
      optic_make: e.opticMake||'', optic_model: e.opticModel||'', optic_serial: e.opticSerial||'', notes: e.notes||'',
    })));
  };

  const downloadTemplate = () => {
    const t = 'Type,LCP,Splitter,Location,Lat,Long,OLT,Shelf,Slot,Port,Optic-Make,Optic-Model,Optic-Serial,Notes\nLCP,LCP-001,SPL-001,"123 Main St",40.7128,-74.0060,OLT-01,0,1,1-4,Finisar,FTLX1475D3BCL,ABC123,Sample';
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t],{type:'text/csv'})); a.download = 'lcp_clcp_template.csv'; a.click();
  };

  const exportToCSV = () => {
    if (!lcpEntries.length) { toast.error('No entries'); return; }
    const h = ['Type','LCP','Splitter','Location','Lat','Long','OLT','Shelf','Slot','Port','Optic-Make','Optic-Model','Optic-Serial','Notes'];
    const rows = lcpEntries.map(e => [(e.lcp_number||'').toUpperCase().startsWith('CLCP')?'CLCP':'LCP',e.lcp_number||'',e.splitter_number||'',e.location||'',e.gps_lat||'',e.gps_lng||'',e.olt_name||'',e.olt_shelf||'',e.olt_slot||'',e.olt_port||'',e.optic_make||'',e.optic_model||'',e.optic_serial||'',e.notes||'']);
    const csv = [h.join(','),...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download = `lcp_entries_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    toast.success(`Exported ${lcpEntries.length} entries`);
  };

  const filteredEntries = lcpEntries
    .filter(entry => {
      const term = filters.searchTerm.toLowerCase();
      if (term) {
        const matchesText = (entry.lcp_number||'').toLowerCase().includes(term) || 
          (entry.splitter_number||'').toLowerCase().includes(term) ||
          (entry.location||'').toLowerCase().includes(term) || 
          (entry.olt_name||'').toLowerCase().includes(term) ||
          (entry.optic_model||'').toLowerCase().includes(term) ||
          (entry.optic_make||'').toLowerCase().includes(term) ||
          (entry.optic_serial||'').toLowerCase().includes(term) ||
          `${entry.olt_shelf}/${entry.olt_slot}/${entry.olt_port}`.includes(term);
        if (!matchesText) return false;
      }
      if (filters.oltName !== 'all' && entry.olt_name !== filters.oltName) return false;
      if (filters.opticMake !== 'all' && entry.optic_make !== filters.opticMake) return false;
      if (filters.opticModel !== 'all' && entry.optic_model !== filters.opticModel) return false;
      if (filters.opticType !== 'all' && entry.optic_type !== filters.opticType) return false;
      if (filters.hasGps === 'yes' && (!entry.gps_lat || !entry.gps_lng)) return false;
      if (filters.hasGps === 'no' && entry.gps_lat && entry.gps_lng) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'lcp_number') return dir * (a.lcp_number||'').localeCompare(b.lcp_number||'',undefined,{numeric:true,sensitivity:'base'});
      if (sortBy === 'splitter_number') return dir * (a.splitter_number||'').localeCompare(b.splitter_number||'',undefined,{numeric:true,sensitivity:'base'});
      if (sortBy === 'location') return dir * (a.location||'').localeCompare(b.location||'',undefined,{numeric:true,sensitivity:'base'});
      if (sortBy === 'olt') { const aO = `${a.olt_name||''} ${a.olt_shelf||''}/${a.olt_slot||''}/${a.olt_port||''}`; const bO = `${b.olt_name||''} ${b.olt_shelf||''}/${b.olt_slot||''}/${b.olt_port||''}`; return dir * aO.localeCompare(bO,undefined,{numeric:true,sensitivity:'base'}); }
      if (sortBy === 'ont_count') { const aK = `${(a.lcp_number||'').trim().toUpperCase()}|${(a.splitter_number||'').trim().toUpperCase()}`; const bK = `${(b.lcp_number||'').trim().toUpperCase()}|${(b.splitter_number||'').trim().toUpperCase()}`; return dir * ((latestOntCountsByKey[aK]||0) - (latestOntCountsByKey[bK]||0)); }
      return dir * ((a.created_date||'') < (b.created_date||'') ? -1 : (a.created_date||'') > (b.created_date||'') ? 1 : 0);
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
              <div><h1 className="text-lg font-semibold text-gray-900 dark:text-white">LCP / CLCP Info</h1><p className="text-xs text-gray-500">Cabinet & Splitter Reference</p></div>
            </div>
            <div className="flex gap-2">
              {selectionMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>{selectedIds.length === filteredEntries.length ? 'Deselect All' : 'Select All'}</Button>
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={!selectedIds.length || bulkDeleteMutation.isPending}><Trash2 className="h-4 w-4 mr-1" />Delete ({selectedIds.length})</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectionMode(false); setSelectedIds([]); }}><X className="h-4 w-4" /></Button>
                </>
              ) : (
                <>
                  {lcpEntries.length > 0 && <Button variant="outline" onClick={() => setSelectionMode(true)}>Select</Button>}
                  <Link to={createPageUrl('LCPMap')}><Button variant="outline" className="relative"><Map className="h-4 w-4 mr-2" />Map View{!entriesWithCoords.length && <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full" />}</Button></Link>
                  <Button variant="outline" onClick={() => setShowOpticImport(true)}><Server className="h-4 w-4 mr-2" />Optic Inventory</Button>
                  <Button variant="outline" onClick={() => setShowImportDialog(true)}><Upload className="h-4 w-4 mr-2" />Import</Button>
                  <Button variant="outline" onClick={exportToCSV} disabled={!lcpEntries.length}><Download className="h-4 w-4 mr-2" />Export</Button>
                </>
              )}
              <LCPEntryForm open={showAddDialog} onOpenChange={setShowAddDialog} formData={formData} setFormData={setFormData} editingId={editingId} onSubmit={handleSubmit} onReset={resetForm}>
                <Button><Plus className="h-4 w-4 mr-2" />Add LCP</Button>
              </LCPEntryForm>
              <OpticInventoryUpload open={showOpticImport} onOpenChange={setShowOpticImport} lcpEntries={lcpEntries} onComplete={() => queryClient.invalidateQueries({ queryKey: ['lcpEntries'] })} />
              <LCPImportDialog open={showImportDialog} onOpenChange={(o) => { setShowImportDialog(o); if (!o) { setImportPreview([]); setImportError(''); setImportWarnings([]); } }} importPreview={importPreview} importError={importError} importWarnings={importWarnings} onFileUpload={handleFileUpload} onConfirmImport={confirmImport} onDownloadTemplate={downloadTemplate} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {!entriesWithCoords.length && lcpEntries.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0" /><p className="text-sm text-amber-800 dark:text-amber-200"><strong>Map view available:</strong> Add GPS coordinates to view on map.</p>
          </div>
        )}
        {latestLcpCountData?.report && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3"><Cloud className="h-5 w-5 text-blue-600 shrink-0" /><div className="text-sm text-blue-800 dark:text-blue-200"><strong>Latest PON PM counts:</strong> {latestLcpCountData.report.report_name}</div></div>
            {isLoadingLatestCounts && <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading...</div>}
          </div>
        )}

        <LCPAdvancedFilters
          lcpEntries={lcpEntries}
          filters={filters}
          onFiltersChange={setFilters}
          showAdvanced={showAdvancedFilters}
          onToggleAdvanced={() => setShowAdvancedFilters(p => !p)}
        />

        <div className="flex gap-2 items-center">
          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(val) => { const [f,o] = val.split('-'); setSortBy(f); setSortOrder(o); }}>
            <SelectTrigger className="w-[160px] h-10"><ArrowUpDown className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_date-desc">Newest First</SelectItem>
              <SelectItem value="created_date-asc">Oldest First</SelectItem>
              <SelectItem value="lcp_number-asc">LCP # (Low-High)</SelectItem>
              <SelectItem value="lcp_number-desc">LCP # (High-Low)</SelectItem>
              <SelectItem value="splitter_number-asc">Splitter (Low-High)</SelectItem>
              <SelectItem value="splitter_number-desc">Splitter (High-Low)</SelectItem>
              <SelectItem value="location-asc">Location (A-Z)</SelectItem>
              <SelectItem value="location-desc">Location (Z-A)</SelectItem>
              <SelectItem value="olt-asc">OLT (A-Z)</SelectItem>
              <SelectItem value="olt-desc">OLT (Z-A)</SelectItem>
              <SelectItem value="ont_count-desc">ONTs (High-Low)</SelectItem>
              <SelectItem value="ont_count-asc">ONTs (Low-High)</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={viewMode==='list'?'default':'ghost'} size="icon" className="rounded-none" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode==='table'?'default':'ghost'} size="icon" className="rounded-none" onClick={() => setViewMode('table')}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
          {filteredEntries.length !== lcpEntries.length && (
            <Badge variant="outline" className="text-xs">{filteredEntries.length} of {lcpEntries.length}</Badge>
          )}
        </div>

        {isLoading ? (
          <Card className="border-0 shadow-lg"><CardContent className="py-12 text-center"><Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" /><h3 className="text-lg font-medium text-gray-600">Loading entries...</h3></CardContent></Card>
        ) : error ? (
          <Card className="border-0 shadow-lg"><CardContent className="py-12 text-center"><CloudOff className="h-12 w-12 text-red-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-600">Failed to load entries</h3></CardContent></Card>
        ) : filteredEntries.length === 0 ? (
          <Card className="border-0 shadow-lg"><CardContent className="py-12 text-center"><Cable className="h-12 w-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-600">{lcpEntries.length === 0 ? 'No LCP entries yet' : 'No matching entries'}</h3><p className="text-sm text-gray-500 mt-1">{lcpEntries.length === 0 ? 'Click "Add LCP" to create your first entry' : 'Try a different search term'}</p></CardContent></Card>
        ) : viewMode === 'table' ? (
          <LCPTableView entries={filteredEntries} selectedIds={selectedIds} selectionMode={selectionMode} latestOntCountsByKey={latestOntCountsByKey} onToggleSelect={toggleSelect} onEdit={handleEdit} onDelete={(id) => deleteMutation.mutate(id)} sortBy={sortBy} sortOrder={sortOrder} onColumnSort={handleColumnSort} />
        ) : (
          <LCPListView entries={filteredEntries} selectedIds={selectedIds} selectionMode={selectionMode} latestOntCountsByKey={latestOntCountsByKey} onToggleSelect={toggleSelect} onEdit={handleEdit} onDelete={(id) => deleteMutation.mutate(id)} updatePending={updateMutation.isPending} deletePending={deleteMutation.isPending} />
        )}

        <div className="text-center text-xs text-gray-400 py-4 flex items-center justify-center gap-2">
          <Cloud className="h-3 w-3" /> {lcpEntries.length} total entries • Synced to cloud database
        </div>
      </main>
    </div>
  );
}