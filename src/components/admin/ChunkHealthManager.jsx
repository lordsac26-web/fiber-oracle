import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  FileText,
  Loader2,
  Database,
  Zap,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function ChunkHealthManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [processingIds, setProcessingIds] = useState(new Set());
  const [bulkProgress, setBulkProgress] = useState(null); // { current, total }
  const [filterMode, setFilterMode] = useState('missing'); // 'missing' | 'all' | 'chunked'

  const { data: allDocs = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['chunkHealth-docs'],
    queryFn: () => base44.entities.ReferenceDocument.list('-created_date', 500),
  });

  // Fetch all chunks grouped by document_id (only need count per doc)
  const { data: allChunks = [], isLoading: loadingChunks } = useQuery({
    queryKey: ['chunkHealth-chunks'],
    queryFn: async () => {
      const PAGE = 500;
      let all = [];
      let offset = 0;
      while (offset < 30000) {
        const batch = await base44.entities.DocumentChunk.list('created_date', PAGE, offset);
        if (!Array.isArray(batch) || batch.length === 0) break;
        all = all.concat(batch.map(c => ({ id: c.id, document_id: c.document_id })));
        if (batch.length < PAGE) break;
        offset += PAGE;
      }
      return all;
    },
  });

  // Build a map of document_id -> chunk count
  const chunkCountMap = useMemo(() => {
    const map = {};
    for (const c of allChunks) {
      map[c.document_id] = (map[c.document_id] || 0) + 1;
    }
    return map;
  }, [allChunks]);

  // Annotate docs with chunk info
  const annotatedDocs = useMemo(() => {
    return allDocs.map(doc => ({
      ...doc,
      chunkCount: chunkCountMap[doc.id] || 0,
      hasContent: !!(doc.content && doc.content.length > 20),
      isActive: doc.is_active !== false,
      chunkedAt: doc.metadata?.chunked_at || null,
    }));
  }, [allDocs, chunkCountMap]);

  // Filter logic
  const filteredDocs = useMemo(() => {
    let docs = annotatedDocs;

    if (filterMode === 'missing') {
      docs = docs.filter(d => d.chunkCount === 0 && d.hasContent && d.isActive);
    } else if (filterMode === 'chunked') {
      docs = docs.filter(d => d.chunkCount > 0);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      docs = docs.filter(d =>
        d.title?.toLowerCase().includes(term) ||
        d.category?.toLowerCase().includes(term)
      );
    }

    return docs;
  }, [annotatedDocs, filterMode, searchTerm]);

  const missingCount = annotatedDocs.filter(d => d.chunkCount === 0 && d.hasContent && d.isActive).length;
  const chunkedCount = annotatedDocs.filter(d => d.chunkCount > 0).length;
  const noContentCount = annotatedDocs.filter(d => !d.hasContent && d.isActive).length;
  const totalChunks = allChunks.length;

  const toggleSelection = (docId) => {
    const next = new Set(selected);
    if (next.has(docId)) next.delete(docId);
    else next.add(docId);
    setSelected(next);
  };

  const selectAllVisible = () => {
    if (selected.size === filteredDocs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredDocs.map(d => d.id)));
    }
  };

  const reprocessSingle = async (docId) => {
    setProcessingIds(prev => new Set([...prev, docId]));
    try {
      const res = await base44.functions.invoke('chunkAndEmbedDocument', { document_id: docId });
      if (res.data?.success) {
        toast.success(`Chunked: ${res.data.chunks_created} chunks created`);
        queryClient.invalidateQueries({ queryKey: ['chunkHealth-docs'] });
        queryClient.invalidateQueries({ queryKey: ['chunkHealth-chunks'] });
      } else if (res.data?.skipped) {
        toast.info(`Skipped: ${res.data.reason}`);
      } else {
        toast.error(`Error: ${res.data?.error || 'Unknown'}`);
      }
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  };

  const reprocessBulk = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    setBulkProgress({ current: 0, total: ids.length });
    let success = 0;
    let failed = 0;

    for (let i = 0; i < ids.length; i++) {
      const docId = ids[i];
      setProcessingIds(prev => new Set([...prev, docId]));
      setBulkProgress({ current: i + 1, total: ids.length });

      try {
        const res = await base44.functions.invoke('chunkAndEmbedDocument', { document_id: docId });
        if (res.data?.success && !res.data?.skipped) success++;
        else if (res.data?.skipped) success++; // counts as handled
        else failed++;
      } catch {
        failed++;
      }

      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });

      // Small delay between calls to avoid rate limits
      if (i < ids.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setBulkProgress(null);
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ['chunkHealth-docs'] });
    queryClient.invalidateQueries({ queryKey: ['chunkHealth-chunks'] });
    toast.success(`Bulk processing complete: ${success} processed, ${failed} failed`);
  };

  const isLoading = loadingDocs || loadingChunks;

  if (isLoading) {
    return (
      <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
        <CardContent className="p-12 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          <span className="text-white/60">Scanning documents and chunks...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-white/5 border border-white/10">
          <CardContent className="p-4 text-center">
            <Database className="h-5 w-5 mx-auto text-cyan-400 mb-1" />
            <div className="text-2xl font-bold text-white">{allDocs.length}</div>
            <div className="text-xs text-white/50">Total Docs</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border border-white/10">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-green-400 mb-1" />
            <div className="text-2xl font-bold text-green-400">{chunkedCount}</div>
            <div className="text-xs text-white/50">Chunked</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border border-white/10">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-yellow-400 mb-1" />
            <div className="text-2xl font-bold text-yellow-400">{missingCount}</div>
            <div className="text-xs text-white/50">Missing Chunks</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border border-white/10">
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 mx-auto text-red-400 mb-1" />
            <div className="text-2xl font-bold text-red-400">{noContentCount}</div>
            <div className="text-xs text-white/50">No Content</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border border-white/10">
          <CardContent className="p-4 text-center">
            <Zap className="h-5 w-5 mx-auto text-purple-400 mb-1" />
            <div className="text-2xl font-bold text-purple-400">{totalChunks.toLocaleString()}</div>
            <div className="text-xs text-white/50">Total Chunks</div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk progress bar */}
      {bulkProgress && (
        <Card className="bg-cyan-500/10 border border-cyan-400/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-cyan-200 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing {bulkProgress.current} of {bulkProgress.total}...
              </span>
              <span className="text-xs text-cyan-300">{Math.round(bulkProgress.current / bulkProgress.total * 100)}%</span>
            </div>
            <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              Chunk Index Health
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              {selected.size > 0 && (
                <Button
                  size="sm"
                  onClick={reprocessBulk}
                  disabled={!!bulkProgress}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Re-process ({selected.size})
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['chunkHealth-docs'] });
                  queryClient.invalidateQueries({ queryKey: ['chunkHealth-chunks'] });
                }}
                className="border-white/30 text-white hover:bg-white/10"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                placeholder="Search by title or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/30"
              />
            </div>
            <div className="flex border border-white/20 rounded-lg overflow-hidden">
              {[
                { key: 'missing', label: `Missing (${missingCount})` },
                { key: 'all', label: 'All' },
                { key: 'chunked', label: 'Chunked' },
              ].map(opt => (
                <Button
                  key={opt.key}
                  size="sm"
                  variant={filterMode === opt.key ? 'default' : 'ghost'}
                  className={`rounded-none text-xs ${filterMode === opt.key ? 'bg-cyan-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                  onClick={() => setFilterMode(opt.key)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Select all */}
          {filteredDocs.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Checkbox
                checked={selected.size === filteredDocs.length && filteredDocs.length > 0}
                onCheckedChange={selectAllVisible}
              />
              <span>Select all {filteredDocs.length} visible</span>
            </div>
          )}

          {/* Document List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredDocs.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                {filterMode === 'missing'
                  ? 'All documents are chunked and indexed!'
                  : 'No documents match your filters'}
              </div>
            ) : (
              filteredDocs.map(doc => {
                const isProcessing = processingIds.has(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                      selected.has(doc.id)
                        ? 'bg-cyan-500/20 border border-cyan-400/50'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                    onClick={() => toggleSelection(doc.id)}
                  >
                    <Checkbox
                      checked={selected.has(doc.id)}
                      onCheckedChange={() => toggleSelection(doc.id)}
                      onClick={e => e.stopPropagation()}
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">{doc.title}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className="text-xs bg-purple-500/50 text-purple-200">{doc.category || 'uncategorized'}</Badge>
                        {doc.chunkCount > 0 ? (
                          <Badge className="text-xs bg-green-500/40 text-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {doc.chunkCount} chunks
                          </Badge>
                        ) : doc.hasContent ? (
                          <Badge className="text-xs bg-yellow-500/40 text-yellow-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            No chunks
                          </Badge>
                        ) : (
                          <Badge className="text-xs bg-red-500/40 text-red-200">
                            No content
                          </Badge>
                        )}
                        {!doc.isActive && (
                          <Badge className="text-xs bg-gray-500/40 text-gray-300">Inactive</Badge>
                        )}
                        {doc.chunkedAt && (
                          <span className="text-[10px] text-white/40 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {moment(doc.chunkedAt).fromNow()}
                          </span>
                        )}
                        <span className="text-[10px] text-white/30">
                          {doc.content ? `${(doc.content.length / 1000).toFixed(0)}k chars` : ''}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        reprocessSingle(doc.id);
                      }}
                      disabled={isProcessing || !!bulkProgress}
                      className="border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/20 flex-shrink-0"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Process
                        </>
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}