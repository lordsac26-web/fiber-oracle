import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Plus } from 'lucide-react';
import MultiFileUpload from '@/components/photon/MultiFileUpload';
import { useQueryClient } from '@tanstack/react-query';

export default function DocumentUploadManager() {
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const handleComplete = () => {
    queryClient.invalidateQueries(['allReferenceDocs']);
    setShowDialog(false);
  };

  return (
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
  );
}