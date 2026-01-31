import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link as LinkIcon, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const CATEGORIES = [
  'installation',
  'troubleshooting',
  'maintenance',
  'safety',
  'specifications',
  'training',
  'other'
];

export default function GoogleDriveLinkForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('other');
  const [comments, setComments] = useState('');
  const [linkedDoc, setLinkedDoc] = useState(null);
  const queryClient = useQueryClient();

  const linkMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('linkGoogleDriveDocument', {
        googleDriveUrl: url,
        category,
        comments
      });
      return data;
    },
    onSuccess: (data) => {
      setLinkedDoc(data.document);
      queryClient.invalidateQueries(['allReferenceDocs']);
      toast.success('Google Drive document linked successfully');
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setUrl('');
        setCategory('other');
        setComments('');
        setLinkedDoc(null);
        setIsOpen(false);
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to link document');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Please enter a Google Drive URL');
      return;
    }
    linkMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-blue-400 text-blue-400 hover:bg-blue-500/20"
        >
          <LinkIcon className="w-4 h-4 mr-2" />
          Link Google Drive
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800/50 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-blue-400" />
            Link Google Drive Document
          </DialogTitle>
          <DialogDescription className="sr-only">
            Link a Google Drive document to your knowledge base
          </DialogDescription>
        </DialogHeader>

        {linkedDoc ? (
          <div className="space-y-4">
            <Card className="bg-green-500/10 border-green-500/30">
              <div className="p-4 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h3 className="font-semibold text-white mb-1">Document Linked!</h3>
                <p className="text-sm text-white/70 mb-3">{linkedDoc.title}</p>
                <div className="flex items-center justify-center gap-2 text-xs">
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    {linkedDoc.category}
                  </Badge>
                  <a 
                    href={linkedDoc.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-white/70 block mb-2">Google Drive URL</label>
              <Input
                placeholder="https://drive.google.com/file/d/1ABC123.../view"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                disabled={linkMutation.isPending}
              />
              <p className="text-xs text-white/50 mt-1">
                You can use the link from Google Drive's "Share" button
              </p>
            </div>

            <div>
              <label className="text-sm text-white/70 block mb-2">Category</label>
              <Select value={category} onValueChange={setCategory} disabled={linkMutation.isPending}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-white/70 block mb-2">Notes (optional)</label>
              <Textarea
                placeholder="Add any notes about this document..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-20"
                disabled={linkMutation.isPending}
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex gap-2 text-xs text-blue-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>The document will be linked and available for AI search within your knowledge base.</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={linkMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={linkMutation.isPending || !url.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {linkMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Link Document
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}