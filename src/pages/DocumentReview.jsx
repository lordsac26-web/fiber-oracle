import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import TagReviewDialog from '@/components/admin/TagReviewDialog';
import { FileText, Search, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function DocumentReview() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  // Fetch documents needing review
  const { data: unreviewedDocs = [], isLoading, refetch } = useQuery({
    queryKey: ['unreviewedDocuments'],
    queryFn: () => base44.entities.ReferenceDocument.filter({ tags_confirmed: false }),
  });

  // Fetch all feedback for stats
  const { data: allFeedback = [] } = useQuery({
    queryKey: ['tagFeedback'],
    queryFn: () => base44.entities.TagFeedback.list(),
  });

  const filteredDocs = unreviewedDocs.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenReview = (doc) => {
    setSelectedDoc(doc);
    setReviewDialogOpen(true);
  };

  const handleReviewComplete = () => {
    refetch();
    setReviewDialogOpen(false);
  };

  const acceptedCount = allFeedback.filter(f => f.feedback_type === 'accepted').length;
  const modifiedCount = allFeedback.filter(f => f.feedback_type === 'modified').length;
  const rejectedCount = allFeedback.filter(f => f.feedback_type === 'rejected').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Document Review Center</h1>
          <p className="text-slate-300">Review and confirm AI-generated categories and tags</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Pending Review</p>
                  <p className="text-2xl font-bold text-white">{unreviewedDocs.length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Accepted</p>
                  <p className="text-2xl font-bold text-white">{acceptedCount}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Modified</p>
                  <p className="text-2xl font-bold text-white">{modifiedCount}</p>
                </div>
                <Sparkles className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">AI Accuracy</p>
                  <p className="text-2xl font-bold text-white">
                    {allFeedback.length > 0
                      ? Math.round((acceptedCount / allFeedback.length) * 100)
                      : 0}%
                  </p>
                </div>
                <Sparkles className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-600 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Documents Awaiting Review</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">Loading...</div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p className="text-slate-400">All documents reviewed!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:bg-slate-900/70 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <FileText className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white mb-2">{doc.title}</h3>
                          
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge className="bg-blue-900/50 text-blue-200 border-blue-700">
                              {doc.category}
                            </Badge>
                            {doc.ai_category_suggestions?.[0] && (
                              <Badge variant="outline" className="border-purple-500 text-purple-300">
                                AI: {doc.ai_category_suggestions[0].confidence_score}% confident
                              </Badge>
                            )}
                          </div>

                          {doc.suggested_tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {doc.suggested_tags.map((tag, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs border-slate-600 text-slate-300"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <p className="text-xs text-slate-500 mt-2">
                            Uploaded: {new Date(doc.created_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleOpenReview(doc)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TagReviewDialog
        document={selectedDoc}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        onConfirm={handleReviewComplete}
      />
    </div>
  );
}