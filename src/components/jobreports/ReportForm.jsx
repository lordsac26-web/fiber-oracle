import React from 'react';
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

export default function ReportForm({ 
  formData, 
  setFormData, 
  onSubmit, 
  onCancel, 
  isEditing, 
  isSubmitting 
}) {
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          <Label>Technician Name</Label>
          <Input
            value={formData.technician_name}
            onChange={(e) => handleFieldChange('technician_name', e.target.value)}
            placeholder="Your name"
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