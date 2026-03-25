import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Save, Navigation } from 'lucide-react';
import { toast } from 'sonner';

export default function LCPEntryForm({ 
  open, onOpenChange, formData, setFormData, editingId, 
  onSubmit, onReset, children 
}) {
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
        () => toast.error('Unable to get location. Please enter manually.')
      );
    } else {
      toast.error('Geolocation not supported by this browser.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) onReset(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit LCP Entry' : 'Add New LCP Entry'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={formData.entryType} onValueChange={(value) => setFormData({ ...formData, entryType: value })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LCP">LCP</SelectItem>
                  <SelectItem value="CLCP">CLCP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{formData.entryType} Number *</Label>
              <Input placeholder={`e.g., ${formData.entryType}-001`} value={formData.lcpNumber} onChange={(e) => setFormData({ ...formData, lcpNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Splitter Number *</Label>
              <Input placeholder="e.g., SPL-001" value={formData.splitterNumber} onChange={(e) => setFormData({ ...formData, splitterNumber: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Physical Location</Label>
            <Input placeholder="e.g., 123 Main St, Pole #45" value={formData.physicalLocation} onChange={(e) => setFormData({ ...formData, physicalLocation: e.target.value })} />
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">GPS Coordinates (Optional)</Label>
              <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation}>
                <Navigation className="h-3 w-3 mr-1" /> Get Current
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Latitude</Label>
                <Input placeholder="e.g., 40.7128" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Longitude</Label>
                <Input placeholder="e.g., -74.0060" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
            <Label className="text-sm font-medium">OLT Location (Logical)</Label>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">OLT Name</Label>
                <Input placeholder="e.g., Copake, OLT-Main, etc." value={formData.oltName} onChange={(e) => setFormData({ ...formData, oltName: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Shelf</Label>
                  <Input placeholder="0" value={formData.oltShelf} onChange={(e) => setFormData({ ...formData, oltShelf: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Slot/Card</Label>
                  <Input placeholder="1" value={formData.oltSlot} onChange={(e) => setFormData({ ...formData, oltSlot: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">PON Port(s)</Label>
                  <Input placeholder="1-4" value={formData.oltPort} onChange={(e) => setFormData({ ...formData, oltPort: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
            <Label className="text-sm font-medium">Optic Information (Optional)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Make</Label>
                <Input placeholder="e.g., Finisar" value={formData.opticMake} onChange={(e) => setFormData({ ...formData, opticMake: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Model</Label>
                <Input placeholder="e.g., FTLX1475D3BCL" value={formData.opticModel} onChange={(e) => setFormData({ ...formData, opticModel: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Serial Number</Label>
              <Input placeholder="Optic serial number" value={formData.opticSerial} onChange={(e) => setFormData({ ...formData, opticSerial: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input placeholder="Additional notes..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => { onOpenChange(false); onReset(); }} className="flex-1">Cancel</Button>
            <Button onClick={onSubmit} className="flex-1">
              <Save className="h-4 w-4 mr-2" /> {editingId ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}