import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_FORM = { title: '', icon: '', content_type: 'markdown', content: '', order: 0, is_active: true };

function TabForm({ value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Tab Title *</Label>
          <Input
            value={value.title}
            onChange={e => onChange({ ...value, title: e.target.value })}
            placeholder="e.g. Install Guide"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Icon (Lucide name)</Label>
          <Input
            value={value.icon}
            onChange={e => onChange({ ...value, icon: e.target.value })}
            placeholder="e.g. BookOpen"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Content Type</Label>
        <Select value={value.content_type} onValueChange={v => onChange({ ...value, content_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="markdown">Markdown</SelectItem>
            <SelectItem value="checklist">Checklist</SelectItem>
            <SelectItem value="calculator">Calculator</SelectItem>
            <SelectItem value="pdf_link">PDF Link</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Content</Label>
        <Textarea
          value={value.content}
          onChange={e => onChange({ ...value, content: e.target.value })}
          placeholder="Markdown content, checklist JSON, or PDF URL…"
          className="h-28 font-mono text-xs"
        />
      </div>
    </div>
  );
}

export default function CustomTabsManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: tabs = [], isLoading } = useQuery({
    queryKey: ['customTabs'],
    queryFn: () => base44.entities.CustomTab.list('order'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customTabs'] });

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setForm({ ...EMPTY_FORM, order: tabs.length });
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    await base44.entities.CustomTab.create({ ...form, order: tabs.length });
    invalidate();
    toast.success('Tab created');
    setCreating(false);
    setForm(EMPTY_FORM);
  };

  const startEdit = (tab) => {
    setEditingId(tab.id);
    setCreating(false);
    setForm({
      title: tab.title,
      icon: tab.icon || 'Info',
      content_type: tab.content_type,
      content: tab.content || '',
      order: tab.order ?? 0,
      is_active: tab.is_active ?? true,
    });
  };

  const handleUpdate = async (id) => {
    await base44.entities.CustomTab.update(id, form);
    invalidate();
    toast.success('Tab updated');
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.CustomTab.delete(id);
    invalidate();
    toast.success('Tab deleted');
  };

  const handleToggleActive = async (tab) => {
    await base44.entities.CustomTab.update(tab.id, { is_active: !tab.is_active });
    invalidate();
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Custom Informational Tabs</CardTitle>
            <CardDescription>Create and manage custom content tabs visible to all users</CardDescription>
          </div>
          <Button size="sm" onClick={startCreate} disabled={creating}>
            <Plus className="h-4 w-4 mr-2" />
            New Tab
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Create form */}
        {creating && (
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/10 space-y-3">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">New Tab</p>
            <TabForm value={form} onChange={setForm} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate}>
                <Check className="h-4 w-4 mr-1" /> Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {isLoading && (
          <p className="text-sm text-gray-500 py-2">Loading tabs…</p>
        )}

        {!isLoading && tabs.length === 0 && !creating && (
          <p className="text-sm text-gray-400 text-center py-6">
            No custom tabs yet. Click "New Tab" to create one.
          </p>
        )}

        {tabs.map(tab => (
          <div key={tab.id} className="border rounded-lg p-4">
            {editingId === tab.id ? (
              <div className="space-y-3">
                <TabForm value={form} onChange={setForm} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleUpdate(tab.id)}>
                    <Check className="h-4 w-4 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{tab.title}</span>
                    <Badge variant="outline" className="text-xs">{tab.content_type}</Badge>
                    {tab.icon && (
                      <span className="text-xs text-gray-400 font-mono">{tab.icon}</span>
                    )}
                    {!(tab.is_active ?? true) && (
                      <Badge variant="secondary" className="text-xs">Hidden</Badge>
                    )}
                  </div>
                  {tab.content && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-sm">
                      {tab.content.slice(0, 100)}{tab.content.length > 100 ? '…' : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={tab.is_active ?? true}
                    onCheckedChange={() => handleToggleActive(tab)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => startEdit(tab)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(tab.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}