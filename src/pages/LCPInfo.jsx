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
  Cable
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function LCPInfo() {
  const [lcpEntries, setLcpEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    lcpNumber: '',
    splitterNumber: '',
    physicalLocation: '',
    oltShelf: '',
    oltSlot: '',
    oltPort: '',
    opticMake: '',
    opticModel: '',
    opticSerial: '',
    notes: ''
  });

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lcpEntries');
    if (saved) {
      setLcpEntries(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage
  const saveEntries = (entries) => {
    localStorage.setItem('lcpEntries', JSON.stringify(entries));
    setLcpEntries(entries);
  };

  const resetForm = () => {
    setFormData({
      lcpNumber: '',
      splitterNumber: '',
      physicalLocation: '',
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

  const handleSubmit = () => {
    if (!formData.lcpNumber || !formData.splitterNumber) {
      toast.error('LCP Number and Splitter Number are required');
      return;
    }

    if (editingId) {
      const updated = lcpEntries.map(entry => 
        entry.id === editingId ? { ...formData, id: editingId } : entry
      );
      saveEntries(updated);
      toast.success('LCP entry updated');
    } else {
      const newEntry = { ...formData, id: Date.now() };
      saveEntries([...lcpEntries, newEntry]);
      toast.success('LCP entry added');
    }

    resetForm();
    setShowAddDialog(false);
  };

  const handleEdit = (entry) => {
    setFormData(entry);
    setEditingId(entry.id);
    setShowAddDialog(true);
  };

  const handleDelete = (id) => {
    const updated = lcpEntries.filter(entry => entry.id !== id);
    saveEntries(updated);
    toast.success('LCP entry deleted');
  };

  const filteredEntries = lcpEntries.filter(entry => {
    const term = searchTerm.toLowerCase();
    return (
      entry.lcpNumber.toLowerCase().includes(term) ||
      entry.splitterNumber.toLowerCase().includes(term) ||
      entry.physicalLocation.toLowerCase().includes(term) ||
      `${entry.oltShelf}/${entry.oltSlot}/${entry.oltPort}`.includes(term)
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

                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                    <Label className="text-sm font-medium">OLT Location (Logical)</Label>
                    <div className="grid grid-cols-3 gap-3">
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
        {filteredEntries.length === 0 ? (
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
                        <Badge className="bg-indigo-600 text-lg px-3 py-1">{entry.lcpNumber}</Badge>
                        <Badge variant="outline" className="font-mono">{entry.splitterNumber}</Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        {entry.physicalLocation && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-xs text-gray-500">Physical Location</div>
                              <div className="text-sm">{entry.physicalLocation}</div>
                            </div>
                          </div>
                        )}

                        {(entry.oltShelf || entry.oltSlot || entry.oltPort) && (
                          <div className="flex items-start gap-2">
                            <Server className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-xs text-gray-500">OLT Location</div>
                              <div className="text-sm font-mono">
                                Shelf {entry.oltShelf || '-'} / Slot {entry.oltSlot || '-'} / Port {entry.oltPort || '-'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {(entry.opticMake || entry.opticModel || entry.opticSerial) && (
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">Optic Info</div>
                          <div className="text-sm">
                            {[entry.opticMake, entry.opticModel].filter(Boolean).join(' ')}
                            {entry.opticSerial && <span className="text-gray-500 ml-2">S/N: {entry.opticSerial}</span>}
                          </div>
                        </div>
                      )}

                      {entry.notes && (
                        <div className="text-sm text-gray-500 italic">{entry.notes}</div>
                      )}
                    </div>

                    <div className="flex gap-1 ml-4">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(entry.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center text-xs text-gray-400 py-4">
          {lcpEntries.length} total entries • Data stored locally on this device
        </div>
      </main>
    </div>
  );
}