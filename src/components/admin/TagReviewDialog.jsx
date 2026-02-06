import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Plus, Sparkles, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function TagReviewDialog({ document, isOpen, onClose, onConfirm }) {
    const [tags, setTags] = useState(document?.suggested_tags || []);
    const [newTag, setNewTag] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addTag = () => {
        const trimmedTag = newTag.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            setTags([...tags, trimmedTag]);
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await base44.entities.ReferenceDocument.update(document.id, {
                tags: tags,
                tags_confirmed: true,
                suggested_tags: []
            });
            toast.success('Tags confirmed successfully');
            onConfirm?.();
            onClose();
        } catch (error) {
            toast.error('Failed to update tags');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!document) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-500" />
                        Review AI-Suggested Tags
                    </DialogTitle>
                    <DialogDescription>
                        The AI has suggested tags for "{document.title}". Review, edit, or add more tags to improve searchability.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Current Tags */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">Tags</label>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[80px] bg-slate-50 dark:bg-slate-900">
                            {tags.length === 0 ? (
                                <p className="text-sm text-gray-400">No tags yet. Add some below.</p>
                            ) : (
                                tags.map((tag, idx) => (
                                    <Badge 
                                        key={idx} 
                                        className="bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1 px-3 py-1"
                                    >
                                        {tag}
                                        <button
                                            onClick={() => removeTag(tag)}
                                            className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Add New Tag */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">Add Custom Tag</label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter tag name..."
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addTag();
                                    }
                                }}
                            />
                            <Button onClick={addTag} variant="outline">
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                            </Button>
                        </div>
                    </div>

                    {/* Document Metadata Preview */}
                    {document.metadata && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                            <p className="text-xs font-semibold text-gray-500 mb-2">DOCUMENT METADATA</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {document.metadata.product_model && (
                                    <div><span className="text-gray-500">Model:</span> <span className="font-medium">{document.metadata.product_model}</span></div>
                                )}
                                {document.metadata.manufacturer && (
                                    <div><span className="text-gray-500">Manufacturer:</span> <span className="font-medium">{document.metadata.manufacturer}</span></div>
                                )}
                                {document.metadata.technology_type && (
                                    <div><span className="text-gray-500">Technology:</span> <span className="font-medium">{document.metadata.technology_type}</span></div>
                                )}
                                {document.metadata.product_category && (
                                    <div><span className="text-gray-500">Category:</span> <span className="font-medium">{document.metadata.product_category}</span></div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={isSubmitting}>
                        <Check className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Confirming...' : 'Confirm Tags'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}