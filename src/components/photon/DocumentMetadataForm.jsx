import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, X } from 'lucide-react';

const CATEGORIES = [
  { value: 'installation', label: 'Installation' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'safety', label: 'Safety' },
  { value: 'specifications', label: 'Specifications' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' }
];

export default function DocumentMetadataForm({ fileName, onSubmit, onCancel }) {
  const [metadata, setMetadata] = useState({
    category: 'other',
    version: '1.0',
    comments: '',
    annotations: []
  });

  const [newAnnotation, setNewAnnotation] = useState({ page: '', text: '' });

  const addAnnotation = () => {
    if (newAnnotation.text.trim()) {
      setMetadata({
        ...metadata,
        annotations: [...metadata.annotations, { 
          page: parseInt(newAnnotation.page) || 0,
          text: newAnnotation.text 
        }]
      });
      setNewAnnotation({ page: '', text: '' });
    }
  };

  const removeAnnotation = (index) => {
    setMetadata({
      ...metadata,
      annotations: metadata.annotations.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = () => {
    onSubmit(metadata);
  };

  return (
    <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <div>
        <h4 className="font-semibold text-sm mb-3 text-gray-900 dark:text-white">
          Document Details: {fileName}
        </h4>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-gray-700 dark:text-gray-300">Category</Label>
          <Select value={metadata.category} onValueChange={(value) => setMetadata({...metadata, category: value})}>
            <SelectTrigger className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-gray-700 dark:text-gray-300">Version</Label>
          <Input
            value={metadata.version}
            onChange={(e) => setMetadata({...metadata, version: e.target.value})}
            placeholder="1.0"
            className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <Label className="text-gray-700 dark:text-gray-300">Comments/Notes</Label>
          <Textarea
            value={metadata.comments}
            onChange={(e) => setMetadata({...metadata, comments: e.target.value})}
            placeholder="Add any relevant notes about this document..."
            rows={3}
            className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <Label className="text-gray-700 dark:text-gray-300">Annotations</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="number"
                value={newAnnotation.page}
                onChange={(e) => setNewAnnotation({...newAnnotation, page: e.target.value})}
                placeholder="Page #"
                className="w-24 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
              <Input
                value={newAnnotation.text}
                onChange={(e) => setNewAnnotation({...newAnnotation, text: e.target.value})}
                placeholder="Annotation text..."
                className="flex-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
              <Button size="sm" onClick={addAnnotation} type="button">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {metadata.annotations.map((ann, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600">
                <span className="font-medium text-blue-600 dark:text-blue-400">P{ann.page || '?'}</span>
                <span className="flex-1 text-gray-900 dark:text-white">{ann.text}</span>
                <Button size="sm" variant="ghost" onClick={() => removeAnnotation(idx)} type="button">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button onClick={handleSubmit} type="button">
          Continue Upload
        </Button>
      </div>
    </div>
  );
}