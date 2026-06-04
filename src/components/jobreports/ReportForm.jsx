import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, Plus, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const EQUIPMENT_OPTIONS = [
  'OTDR', 'OLTS', 'Power Meter', 'Light Source', 'Visual Fault Locator',
  'Fiber Scope', 'Fusion Splicer', 'Cleaver', 'Connector Kit', 'Cleaning Kit',
];

const FIBER_TYPES = ['OS2 SMF', 'OM3', 'OM4', 'OM5', 'G.657.A1', 'G.657.A2', 'G.657.B3'];
const WAVELENGTHS = ['1310nm', '1550nm', '1625nm', '850nm', '1300nm', '1310nm + 1550nm'];

export default function ReportForm({ 
  formData, 
  setFormData, 
  onSubmit, 
  onCancel, 
  isEditing, 
  isSubmitting 
}) {
  const [uploading, setUploading] = useState(false);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const currentPhotos = formData.photo_urls || [];
      handleFieldChange('photo_urls', [...currentPhotos, file_url]);
      toast.success('Photo uploaded');
    } catch (error) {
      toast.error('Failed to upload photo');
    }
    setUploading(false);
    e.target.value = '';
  };

  const removePhoto = (index) => {
    const currentPhotos = formData.photo_urls || [];
    handleFieldChange('photo_urls', currentPhotos.filter((_, i) => i !== index));
  };

  const fiberInfo = formData.fiber_info || {};
  const handleFiberInfoChange = (field, value) => {
    handleFieldChange('fiber_info', { ...fiberInfo, [field]: value });
  };

  const toggleEquipment = (item) => {
    const current = formData.equipment_used || [];
    handleFieldChange('equipment_used',
      current.includes(item) ? current.filter(e => e !== item) : [...current, item]
    );
  };

  const passFail = formData.fiber_info?.pass_fail || '';

  return (
    <form onSubmit={onSubmit} className="flex flex-col overflow-hidden flex-1 min-h-0">
    <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1 pb-2">
      {/* ── Job Info ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">Job Info</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Job Number *</Label>
            <Input
              value={formData.job_number}
              onChange={(e) => handleFieldChange('job_number', e.target.value)}
              placeholder="e.g., WO-2024-001"
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Technician Name</Label>
            <Input
              value={formData.technician_name}
              onChange={(e) => handleFieldChange('technician_name', e.target.value)}
              placeholder="Name or tech number"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Location / Address</Label>
            <Input
              value={formData.location}
              onChange={(e) => handleFieldChange('location', e.target.value)}
              placeholder="Job site address"
            />
          </div>
          <div className="space-y-1">
            <Label>Job Status</Label>
            <Select value={formData.status} onValueChange={(v) => handleFieldChange('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="needs_followup">Needs Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </fieldset>

      {/* ── Fiber / Test Details ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fiber &amp; Test Details</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Test Type</Label>
            <Select value={fiberInfo.test_type || ''} onValueChange={(v) => handleFiberInfoChange('test_type', v)}>
              <SelectTrigger><SelectValue placeholder="Select test type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="loss_budget">Loss Budget (OLTS)</SelectItem>
                <SelectItem value="otdr">OTDR Trace</SelectItem>
                <SelectItem value="inspection">Connector Inspection</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="full">Full Certification</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Fiber Type</Label>
            <Select value={fiberInfo.fiber_type || ''} onValueChange={(v) => handleFiberInfoChange('fiber_type', v)}>
              <SelectTrigger><SelectValue placeholder="Select fiber type" /></SelectTrigger>
              <SelectContent>
                {FIBER_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Cable ID / Strand</Label>
            <Input
              value={fiberInfo.cable_id || ''}
              onChange={(e) => handleFiberInfoChange('cable_id', e.target.value)}
              placeholder="e.g., CAB-A, Strand 4"
            />
          </div>
          <div className="space-y-1">
            <Label>Wavelength(s)</Label>
            <Select value={fiberInfo.wavelength || ''} onValueChange={(v) => handleFiberInfoChange('wavelength', v)}>
              <SelectTrigger><SelectValue placeholder="Select wavelength" /></SelectTrigger>
              <SelectContent>
                {WAVELENGTHS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </fieldset>

      {/* ── Power Levels & Pass/Fail ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">Optical Readings &amp; Result</legend>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Start Power (dBm)</Label>
            <Input
              type="number" step="0.01"
              value={formData.start_power_level}
              onChange={(e) => handleFieldChange('start_power_level', e.target.value)}
              placeholder="-25.5"
            />
          </div>
          <div className="space-y-1">
            <Label>End Power (dBm)</Label>
            <Input
              type="number" step="0.01"
              value={formData.end_power_level}
              onChange={(e) => handleFieldChange('end_power_level', e.target.value)}
              placeholder="-22.0"
            />
          </div>
          <div className="space-y-1">
            <Label>Loss Budget (dB)</Label>
            <Input
              type="number" step="0.01"
              value={fiberInfo.loss_budget || ''}
              onChange={(e) => handleFiberInfoChange('loss_budget', e.target.value)}
              placeholder="e.g., 3.5"
            />
          </div>
        </div>

        {/* Pass / Fail selector */}
        <div className="space-y-1">
          <Label>Overall Result</Label>
          <div className="flex gap-2">
            {[
              { value: 'pass', label: 'Pass', icon: CheckCircle2, cls: 'border-green-500 bg-green-50 text-green-700' },
              { value: 'fail', label: 'Fail', icon: XCircle, cls: 'border-red-500 bg-red-50 text-red-700' },
              { value: 'marginal', label: 'Marginal', icon: AlertTriangle, cls: 'border-amber-500 bg-amber-50 text-amber-700' },
            ].map(({ value, label, icon: Icon, cls }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleFiberInfoChange('pass_fail', passFail === value ? '' : value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${passFail === value ? cls : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      {/* ── Equipment Used ── */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">Equipment Used</legend>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map((item) => {
            const selected = (formData.equipment_used || []).includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleEquipment(item)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${selected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400'}`}
              >
                {selected && <Plus className="inline h-3 w-3 mr-1 rotate-45" />}
                {item}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* ── Notes ── */}
      <div className="space-y-1">
        <Label>Notes &amp; Observations</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          placeholder="Issues found, actions taken, recommendations..."
          rows={3}
        />
      </div>

      {/* ── Photos ── */}
      <div className="space-y-2">
        <Label>Photos</Label>
        <div className="flex flex-wrap gap-2">
          {(formData.photo_urls || []).map((url, index) => (
            <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border">
              <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <label className={`w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? (
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            ) : (
              <>
                <Upload className="h-5 w-5 text-gray-400" />
                <span className="text-xs text-gray-400 mt-1">Add</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      </div>

    </div>

      <div className="flex justify-end gap-2 pt-3 border-t mt-2 flex-shrink-0">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Report' : 'Submit Report'}
        </Button>
      </div>
    </form>
  );
}