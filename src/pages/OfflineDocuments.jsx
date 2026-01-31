import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Download,
  Trash2,
  FileText,
  Award,
  BookOpen,
  ClipboardList,
  HardDrive,
  WifiOff,
  RefreshCw,
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  getAllDocuments,
  deleteDocumentOffline,
  openOfflineDocument,
  getStorageUsed,
  formatBytes,
  clearAllDocuments,
  saveDocumentOffline
} from '@/components/OfflineDocumentService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const DOCUMENT_TYPES = {
  studyGuide: { label: 'Study Guide', icon: BookOpen, color: 'bg-green-500' },
  certificate: { label: 'Certificate', icon: Award, color: 'bg-purple-500' },
  brochure: { label: 'Brochure', icon: FileText, color: 'bg-blue-500' },
  jobReport: { label: 'Job Report', icon: ClipboardList, color: 'bg-slate-500' },
  manual: { label: 'User Manual', icon: BookOpen, color: 'bg-indigo-500' },
};

export default function OfflineDocuments() {
  const [documents, setDocuments] = useState([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [savingDoc, setSavingDoc] = useState(null);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncingPDF, setSyncingPDF] = useState(false);
  const [referenceDocs, setReferenceDocs] = useState([]);

  useEffect(() => {
    loadDocuments();
    loadReferenceDocs();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadReferenceDocs = async () => {
    try {
      const docs = await base44.entities.ReferenceDocument.filter({ is_active: true }, '-created_date', 50);
      setReferenceDocs(docs || []);
    } catch (error) {
      console.error('Failed to load reference docs:', error);
    }
  };

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await getAllDocuments();
      setDocuments(docs.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)));
      const used = await getStorageUsed();
      setStorageUsed(used);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocumentOffline(id);
      loadDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleOpen = async (id) => {
    try {
      await openOfflineDocument(id);
    } catch (error) {
      console.error('Failed to open document:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllDocuments();
      setShowClearDialog(false);
      loadDocuments();
    } catch (error) {
      console.error('Failed to clear documents:', error);
    }
  };

  const handleSaveBrochure = async () => {
    setSavingDoc('brochure');
    try {
      const response = await base44.functions.invoke('generatePDF', {
        type: 'brochure'
      }, { responseType: 'arraybuffer' });

      await saveDocumentOffline(
        'brochure-main',
        'brochure',
        'Fiber Oracle Brochure',
        response.data,
        { version: '2.0' }
      );
      loadDocuments();
    } catch (error) {
      console.error('Failed to save brochure:', error);
    }
    setSavingDoc(null);
  };

  const handleSyncPDFToOffline = async (doc) => {
    setSyncingPDF(doc.id);
    try {
      // Call backend function to extract and prepare PDF
      const response = await base44.functions.invoke('syncPDFsToOffline', {
        file_url: doc.source_url,
        title: doc.title,
        category: doc.category
      });

      if (response.data.success) {
        // Save to local offline storage
        const pdfResponse = await fetch(doc.source_url);
        const pdfData = await pdfResponse.blob();
        
        await saveDocumentOffline(
          doc.id,
          'reference',
          doc.title,
          pdfData,
          { 
            category: doc.category,
            version: doc.version,
            extracted: response.data.content_extracted 
          }
        );

        loadDocuments();
      }
    } catch (error) {
      console.error('Failed to sync PDF:', error);
    }
    setSyncingPDF(null);
  };

  const getTypeInfo = (type) => DOCUMENT_TYPES[type] || DOCUMENT_TYPES.manual;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Offline Documents</h1>
                <p className="text-xs text-gray-500">Saved for offline access</p>
              </div>
            </div>
            <Badge variant={isOnline ? "outline" : "secondary"} className={isOnline ? "border-green-300 text-green-700" : "bg-amber-100 text-amber-700"}>
              {isOnline ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Storage Info */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <HardDrive className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium">Storage Used</p>
                  <p className="text-sm text-gray-500">{formatBytes(storageUsed)} • {documents.length} documents</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadDocuments}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
                {documents.length > 0 && (
                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => setShowClearDialog(true)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Save Section */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600" />
              Save Documents for Offline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">Fiber Oracle Brochure</p>
                  <p className="text-xs text-gray-500">App overview and features</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleSaveBrochure}
                disabled={savingDoc === 'brochure' || !isOnline}
              >
                {savingDoc === 'brochure' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowSyncDialog(true)}
              disabled={!isOnline || referenceDocs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Sync Reference PDFs ({referenceDocs.length})
            </Button>

            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>Tip:</strong> Study guides and certificates are automatically saved when you download them from the Education Center.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Saved Documents List */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-emerald-600" />
              Saved Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <WifiOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No documents saved for offline access</p>
                <p className="text-sm text-gray-400 mt-1">Download documents while online to access them offline</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const typeInfo = getTypeInfo(doc.type);
                  const TypeIcon = typeInfo.icon;
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                          <TypeIcon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{doc.title}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Badge variant="outline" className="text-xs py-0">{typeInfo.label}</Badge>
                            <span>•</span>
                            <span>{formatBytes(doc.size)}</span>
                            <span>•</span>
                            <span>{new Date(doc.savedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpen(doc.id)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(doc.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200">About Offline Storage</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Documents are stored in your browser's local storage. Clearing browser data will remove saved documents. 
                  For best results, keep documents under 50MB total.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Clear All Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Documents?</DialogTitle>
            <DialogDescription>
              This will permanently delete all {documents.length} saved documents from offline storage. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearAll}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync PDFs Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sync Reference Documents</DialogTitle>
            <DialogDescription>
              Select PDFs to save for offline access. Synced documents will be available anytime, even without internet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {referenceDocs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.title}</p>
                  <p className="text-xs text-gray-500">{doc.category}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSyncPDFToOffline(doc)}
                  disabled={syncingPDF === doc.id || !isOnline}
                >
                  {syncingPDF === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSyncDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}