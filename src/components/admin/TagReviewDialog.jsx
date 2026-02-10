import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function TagReviewDialog({ document, open, onOpenChange, onConfirm }) {
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (document) {
      setSelectedTags(document.suggested_tags || []);
      setSelectedCategory(document.category || 'other');
      setNotes('');
    }
  }, [document]);

  const confirmMutation = useMutation({
    mutationFn: async ({ documentId, category, tags, notes }) => {
      return base44.functions.invoke('submitTagFeedback', {
        document_id: documentId,
        confirmed_category: category,
        confirmed_tags: tags,
        user_notes: notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referenceDocs'] });
      queryClient.invalidateQueries({ queryKey: ['unreviewedDocuments'] });
      toast.success('Feedback submitted successfully');
      onConfirm?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit feedback');
    }
  });

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
      setNewTag('');
    }
  };

  const handleConfirm = () => {
    confirmMutation.mutate({ 
      documentId: document.id,
      category: selectedCategory,
      tags: selectedTags,
      notes: notes
    });
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Review AI Suggestions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Document</h3>
            <p className="text-gray-700 dark:text-gray-300">{document?.title}</p>
            {document?.ai_category_suggestions?.[0] && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                AI Confidence: {document.ai_category_suggestions[0].confidence_score}%
                {document.ai_category_suggestions[0].reasoning && (
                  <p className="mt-1 italic">{document.ai_category_suggestions[0].reasoning}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Category</h3>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800">
                <SelectItem value="installation">Installation</SelectItem>
                <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="specifications">Specifications</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
              Tags {document?.suggested_tags?.length > 0 && <span className="text-xs text-gray-500 dark:text-gray-400">(AI suggested)</span>}
            </h3>
            <div className="flex flex-wrap gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[60px] bg-gray-50 dark:bg-gray-900">
              {selectedTags.length === 0 ? (
                <span className="text-sm text-gray-400">No tags selected</span>
              ) : (
                selectedTags.map((tag, idx) => (
                  <Badge
                    key={idx}
                    className="bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Add new tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
            />
            <Button onClick={handleAddTag} type="button">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Feedback Notes (Optional)</h3>
            <Textarea
              placeholder="Any notes about why you made changes to the AI suggestions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 h-20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={confirmMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? 'Submitting...' : 'Confirm & Submit Feedback'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}