import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const SUPPORTED_FORMATS = ['.pdf', '.txt', '.doc', '.docx', '.md', '.csv', '.json', '.xml'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 10;

import DocumentMetadataForm from './DocumentMetadataForm';

export default function MultiFileUpload({ onComplete, onClose, isAdmin = true }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processedFiles, setProcessedFiles] = useState([]);
  const [currentMetadataFile, setCurrentMetadataFile] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Validate file count
    if (selectedFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed at once`);
      return;
    }

    // Validate each file
    const validFiles = selectedFiles.filter(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      const isValidFormat = SUPPORTED_FORMATS.includes(ext);
      const isValidSize = file.size <= MAX_FILE_SIZE;

      if (!isValidFormat) {
        toast.error(`${file.name}: Unsupported format`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name}: File too large (max 50MB)`);
        return false;
      }
      return true;
    });

    setFiles(validFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0,
      stage: '',
      documentId: null,
      isActive: true,
      metadata: null
    })));
  };

  const updateFileStatus = (index, updates) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const processFile = async (fileObj, index) => {
    const userMetadata = fileObj.metadata || {};
    
    try {
      updateFileStatus(index, { status: 'uploading', stage: 'Uploading file...', progress: 10 });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file: fileObj.file });
      
      updateFileStatus(index, { stage: 'Extracting content...', progress: 40 });
      
      // Extract content
      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "object",
          properties: {
            full_text: { type: "string" },
            sections: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (extraction.status === 'success' && extraction.output) {
        updateFileStatus(index, { stage: 'Creating document entry...', progress: 70 });
        
        // Create reference document or submission based on user role
        let doc;
        if (isAdmin) {
          doc = await base44.entities.ReferenceDocument.create({
            title: fileObj.file.name.replace(/\.[^/.]+$/, ''),
            category: userMetadata.category || 'other',
            version: userMetadata.version || '1.0',
            comments: userMetadata.comments || '',
            annotations: userMetadata.annotations || [],
            source_type: 'pdf',
            source_url: file_url,
            content: extraction.output.full_text || JSON.stringify(extraction.output),
            metadata: {
              page_count: extraction.output.sections?.length || 0,
              upload_date: new Date().toISOString(),
              file_size: fileObj.file.size,
              original_filename: fileObj.file.name,
              file_type: fileObj.file.type
            },
            is_active: true
          });
        } else {
          const user = await base44.auth.me();
          doc = await base44.entities.DocumentSubmission.create({
            title: fileObj.file.name.replace(/\.[^/.]+$/, ''),
            category: userMetadata.category || 'other',
            version: userMetadata.version || '1.0',
            comments: userMetadata.comments || '',
            annotations: userMetadata.annotations || [],
            add_to_master: userMetadata.addToMaster || false,
            source_type: 'pdf',
            source_url: file_url,
            content: extraction.output.full_text || JSON.stringify(extraction.output),
            metadata: {
              page_count: extraction.output.sections?.length || 0,
              upload_date: new Date().toISOString(),
              file_size: fileObj.file.size,
              original_filename: fileObj.file.name,
              file_type: fileObj.file.type
            },
            submitted_by: user.email,
            status: 'pending',
            security_scan_status: 'pending'
          });
          
          // Send email notification if adding to master list
          if (userMetadata.addToMaster) {
            try {
              await base44.integrations.Core.SendEmail({
                to: 'admin@fiberoracle.com',
                subject: `Master List Request: ${doc.title}`,
                body: `
New document submitted for master knowledge base:

Title: ${doc.title}
Category: ${doc.category}
Submitted by: ${user.email}
Comments: ${doc.comments || 'None'}

View in admin panel to approve or deny.
                `
              });
            } catch (emailError) {
              console.error('Failed to send admin notification:', emailError);
            }
          }
        }

        updateFileStatus(index, { 
          status: 'success', 
          stage: isAdmin ? 'Indexed successfully!' : 'Submitted for review!', 
          progress: 100,
          documentId: doc.id
        });

        return { success: true, doc };
      } else {
        throw new Error('Failed to extract content');
      }
    } catch (error) {
      updateFileStatus(index, { 
        status: 'error', 
        stage: error.message,
        progress: 0
      });
      return { success: false, error: error.message };
    }
  };

  const startMetadataCollection = () => {
    if (files.length > 0) {
      setCurrentMetadataFile(0);
    }
  };

  const handleMetadataSubmit = (metadata) => {
    updateFileStatus(currentMetadataFile, { metadata });
    const nextFile = currentMetadataFile + 1;
    if (nextFile < files.length) {
      setCurrentMetadataFile(nextFile);
    } else {
      setCurrentMetadataFile(null);
      handleUpload();
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const result = await processFile(files[i], i);
      results.push(result);
    }

    setUploading(false);
    setProcessedFiles(results);
    
    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      toast.success(`Successfully indexed ${successCount} document${successCount > 1 ? 's' : ''}`);
    }
  };

  const toggleDocumentActive = async (index) => {
    const fileObj = files[index];
    if (!fileObj.documentId) return;

    try {
      await base44.entities.ReferenceDocument.update(fileObj.documentId, {
        is_active: !fileObj.isActive
      });
      updateFileStatus(index, { isActive: !fileObj.isActive });
      toast.success(`Document ${fileObj.isActive ? 'deactivated' : 'activated'}`);
    } catch (error) {
      toast.error('Failed to update document status');
    }
  };

  const allComplete = files.length > 0 && files.every(f => f.status === 'success' || f.status === 'error');

  if (currentMetadataFile !== null) {
    return (
      <DocumentMetadataForm
        fileName={files[currentMetadataFile]?.file.name}
        onSubmit={handleMetadataSubmit}
        onCancel={() => setCurrentMetadataFile(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* File limitations info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">Upload Limitations</h4>
        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Maximum {MAX_FILES} files per upload</li>
          <li>• Maximum 50MB per file</li>
          <li>• Supported formats: {SUPPORTED_FORMATS.join(', ')}</li>
          <li>• All documents will be indexed and made searchable</li>
        </ul>
      </div>

      {/* File selector */}
      {files.length === 0 && (
        <label className="block">
          <div className="border-2 border-dashed rounded-xl p-8 transition-colors cursor-pointer border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-10 w-10 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Click to upload or drag and drop
              </span>
              <span className="text-xs text-gray-400">
                Select up to {MAX_FILES} files
              </span>
            </div>
          </div>
          <input
            type="file"
            multiple
            accept={SUPPORTED_FORMATS.join(',')}
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}

      {/* File list with progress */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((fileObj, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-gray-900 dark:text-white">
                      {fileObj.file.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(fileObj.file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {fileObj.status === 'success' && fileObj.documentId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDocumentActive(index)}
                      disabled={uploading}
                    >
                      {fileObj.isActive ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  )}
                  {fileObj.status === 'success' && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {fileObj.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  {fileObj.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiles(files.filter((_, i) => i !== index))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {fileObj.status !== 'pending' && (
                <>
                  <Progress value={fileObj.progress} className="h-2 mb-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {fileObj.stage}
                    </span>
                    {fileObj.status === 'success' && (
                      <Badge variant="outline" className={fileObj.isActive ? 'bg-green-50 text-green-700 border-green-300' : 'bg-gray-50 text-gray-500 border-gray-300'}>
                        {fileObj.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={uploading}
        >
          {allComplete ? 'Close' : 'Cancel'}
        </Button>
        <div className="flex gap-2">
          {allComplete ? (
            <Button onClick={() => { onComplete(); onClose(); }}>
              Done
            </Button>
          ) : files.length > 0 && (
            <Button
              onClick={startMetadataCollection}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Next: Add Details
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}