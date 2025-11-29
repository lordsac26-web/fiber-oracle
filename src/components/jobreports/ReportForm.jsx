import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, Image } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Job Number *</Label>
          <Input
            value={formData.job_number}
            onChange={(e) => handleFieldChange('job_number', e.target.value)}
            placeholder="e.g., WO-2024-001"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Technician Name / ID</Label>
          <Input
            value={formData.technician_name}
            onChange={(e) => handleFieldChange('technician_name', e.target.value)}
            placeholder="Name or tech number"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <Input
          value={formData.location}
          onChange={(e) => handleFieldChange('location', e.target.value)}
          placeholder="Job site address"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Start Power (dBm)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.start_power_level}
            onChange={(e) => handleFieldChange('start_power_level', e.target.value)}
            placeholder="-25.5"
          />
        </div>
        <div className="space-y-2">
          <Label>End Power (dBm)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.end_power_level}
            onChange={(e) => handleFieldChange('end_power_level', e.target.value)}
            placeholder="-22.0"
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => handleFieldChange('status', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="needs_followup">Needs Follow-up</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          placeholder="Observations, issues found, actions taken..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Photos (optional)</Label>
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
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isEditing ? 'Update Report' : 'Create Report'}
        </Button>
      </div>
    </form>
  );
}