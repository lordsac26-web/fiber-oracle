import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Eye,
  EyeOff,
  Loader2,
  Link as LinkIcon,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const SUPPORTED_FORMATS = ['.pdf', '.txt', '.doc', '.docx', '.md', '.csv', '.json', '.xml'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB - Platform limit
const MAX_FILES = 20; // Increased from 10
const CATEGORIES = ['installation', 'troubleshooting', 'maintenance', 'safety', 'specifications', 'training', 'other'];

import DocumentMetadataForm from './DocumentMetadataForm';

export default function MultiFileUpload({ onComplete, onClose, isAdmin = true }) {
  const [activeTab, setActiveTab] = useState('local');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processedFiles, setProcessedFiles] = useState([]);
  const [currentMetadataFile, setCurrentMetadataFile] = useState(null);
  
  // Google Drive states
  const [driveUrl, setDriveUrl] = useState('');
  const [driveCategory, setDriveCategory] = useState('other');
  const [driveComments, setDriveComments] = useState('');
  const [driveLinked, setDriveLinked] = useState(null);
  const [driveLinking, setDriveLinking] = useState(false);

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
      
      // Upload with retry logic for network issues
      let file_url;
      try {
        const uploadResult = await base44.integrations.Core.UploadFile({ file: fileObj.file });
        file_url = uploadResult.file_url;
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message || 'Network error. Please check your connection and try again.'}`);
      }
      
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
        updateFileStatus(index, { stage: 'Analyzing content...', progress: 60 });
        
        // Get AI category and tag suggestions
        let aiSuggestions = null;
        try {
          const suggestResult = await base44.functions.invoke('suggestDocumentCategories', {
            content: extraction.output.full_text || JSON.stringify(extraction.output),
            title: fileObj.file.name.replace(/\.[^/.]+$/, '')
          });
          aiSuggestions = suggestResult.data.suggestions;
        } catch (error) {
          console.error('AI suggestion failed:', error);
        }

      updateFileStatus(index, { stage: 'Creating document entry...', progress: 75 });
        
        // Create reference document or submission based on user role
        let doc;
        if (isAdmin) {
          doc = await base44.entities.ReferenceDocument.create({
            title: fileObj.file.name.replace(/\.[^/.]+$/, ''),
            category: aiSuggestions?.primary_category || userMetadata.category || 'other',
            custom_categories: aiSuggestions?.additional_categories || [],
            version: userMetadata.version || '1.0',
            comments: userMetadata.comments || '',
            annotations: userMetadata.annotations || [],
            source_type: 'pdf',
            source_url: file_url,
            content: extraction.output.full_text || JSON.stringify(extraction.output),
            suggested_tags: aiSuggestions?.suggested_tags || [],
            tags_confirmed: false,
            ai_category_suggestions: aiSuggestions ? [{
              primary_category: aiSuggestions.primary_category,
              additional_categories: aiSuggestions.additional_categories,
              confidence_score: aiSuggestions.confidence_score,
              reasoning: aiSuggestions.reasoning,
              suggested_at: new Date().toISOString()
            }] : [],
            metadata: {
              page_count: extraction.output.sections?.length || 0,
              upload_date: new Date().toISOString(),
              file_size: fileObj.file.size,
              original_filename: fileObj.file.name,
              file_type: fileObj.file.type
            },
            is_active: true
          });
          
          // Log audit event for admin uploads
          try {
            const user = await base44.auth.me();
            await base44.entities.AuditLog.create({
              event_type: 'document_reference',
              user_email: user.email,
              content: `Added document: ${doc.title}`,
              metadata: {
                action: 'added',
                document_id: doc.id,
                document_title: doc.title,
                category: doc.category,
                is_active: true,
                file_size: fileObj.file.size
              },
              status: 'success'
            });
          } catch (auditError) {
            console.error('Audit log failed:', auditError);
          }
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
              const adminEmail = import.meta.env.VITE_ADMIN_CONTACT_EMAIL || 'support@fiberoracle.com';
              await base44.integrations.Core.SendEmail({
                to: adminEmail,
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

  const handleGoogleDriveLink = async () => {
    if (!driveUrl.trim()) {
      toast.error('Please enter a Google Drive URL');
      return;
    }

    setDriveLinking(true);
    try {
      const { data } = await base44.functions.invoke('linkGoogleDriveDocument', {
        googleDriveUrl: driveUrl,
        category: driveCategory,
        comments: driveComments
      });
      
      setDriveLinked(data.document);
      toast.success('Google Drive document linked successfully');
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setDriveUrl('');
        setDriveCategory('other');
        setDriveComments('');
        setDriveLinked(null);
        onComplete();
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to link document');
    } finally {
      setDriveLinking(false);
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="local" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Files
          </TabsTrigger>
          <TabsTrigger value="googledrive" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Google Drive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="local" className="space-y-4 mt-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">Upload Limitations</h4>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Maximum {MAX_FILES} files per batch upload</li>
              <li>• Maximum 50MB per file (platform limit)</li>
              <li>• Supported formats: {SUPPORTED_FORMATS.join(', ')}</li>
              <li>• All documents are indexed and searchable</li>
              <li>• For larger files (&gt;50MB), split into smaller chunks or compress</li>
            </ul>
          </div>

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

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={uploading}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
            >
              {allComplete ? 'Close' : 'Cancel'}
            </Button>
            <div className="flex gap-2">
              {allComplete ? (
                <Button 
                  onClick={() => { onComplete(); onClose(); }}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold shadow-lg"
                >
                  Done
                </Button>
              ) : files.length > 0 && (
                <Button
                  onClick={startMetadataCollection}
                  disabled={uploading}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Continue Upload
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="googledrive" className="space-y-4 mt-4">
          {driveLinked ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6">
                <div className="text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Document Linked!</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{driveLinked.title}</p>
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                      {driveLinked.category}
                    </Badge>
                    <a 
                      href={driveLinked.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">Link Google Drive Document</h4>
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Link a document from Google Drive to make it searchable in your knowledge base. The document will remain in Google Drive.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                    Google Drive URL
                  </label>
                  <Input
                    placeholder="https://drive.google.com/file/d/1ABC123.../view"
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    disabled={driveLinking}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    You can use the link from Google Drive's "Share" button
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                    Category
                  </label>
                  <Select value={driveCategory} onValueChange={setDriveCategory} disabled={driveLinking}>
                    <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                    Notes (optional)
                  </label>
                  <Textarea
                    placeholder="Add any notes about this document..."
                    value={driveComments}
                    onChange={(e) => setDriveComments(e.target.value)}
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 h-20"
                    disabled={driveLinking}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={driveLinking}
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGoogleDriveLink}
                  disabled={driveLinking || !driveUrl.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg"
                >
                  {driveLinking ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Link Document
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}