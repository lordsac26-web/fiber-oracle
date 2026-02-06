import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Plus, Tags } from 'lucide-react';
import MultiFileUpload from '@/components/photon/MultiFileUpload';
import GoogleDriveLinkForm from './GoogleDriveLinkForm';
import TagReviewDialog from './TagReviewDialog';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";

export default function DocumentUploadManager() {
  const [showDialog, setShowDialog] = useState(false);
  const [reviewDoc, setReviewDoc] = useState(null);
  const queryClient = useQueryClient();

  // Fetch documents with unconfirmed tags
  const { data: unconfirmedDocs = [] } = useQuery({
    queryKey: ['unconfirmedTags'],
    queryFn: async () => {
      const docs = await base44.entities.ReferenceDocument.filter({ tags_confirmed: false });
      return docs.filter(doc => doc.suggested_tags && doc.suggested_tags.length > 0);
    },
    refetchInterval: 10000 // Check every 10 seconds
  });

  const handleComplete = () => {
    queryClient.invalidateQueries(['allReferenceDocs']);
    queryClient.invalidateQueries(['unconfirmedTags']);
    setShowDialog(false);
  };

  const handleTagConfirm = () => {
    queryClient.invalidateQueries(['allReferenceDocs']);
    queryClient.invalidateQueries(['unconfirmedTags']);
    setReviewDoc(null);
  };

  return (
    <>
      <div className="flex gap-2">
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Plus className="w-4 h-4 mr-2" />
              Add Documents
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Reference Documents
              </DialogTitle>
            </DialogHeader>
            <MultiFileUpload 
              onComplete={handleComplete}
              onClose={() => setShowDialog(false)}
              isAdmin={true}
            />
          </DialogContent>
        </Dialog>
        <GoogleDriveLinkForm />
        {unconfirmedDocs.length > 0 && (
          <Button 
            size="sm" 
            variant="outline" 
            className="border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
            onClick={() => setReviewDoc(unconfirmedDocs[0])}
          >
            <Tags className="w-4 h-4 mr-2" />
            Review Tags
            <Badge className="ml-2 bg-amber-500 text-white">{unconfirmedDocs.length}</Badge>
          </Button>
        )}
      </div>

      <TagReviewDialog
        document={reviewDoc}
        isOpen={!!reviewDoc}
        onClose={() => setReviewDoc(null)}
        onConfirm={handleTagConfirm}
      />
    </>
  );
}