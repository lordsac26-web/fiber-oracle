import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, TrendingUp, Activity, Zap, UserCheck } from 'lucide-react';

const CATEGORIES = ['installation', 'troubleshooting', 'maintenance', 'safety', 'specifications', 'training', 'other'];

export default function AdminAnalyticsTab({ analytics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
          <CardHeader className="pb-3"><CardTitle className="text-white text-xs">Total Queries</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-400">{analytics.ai.totalQueries}</div>
            <p className="text-xs text-white/60 mt-1">{analytics.ai.avgQueriesPerDay} per day</p>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="pb-3"><CardTitle className="text-white text-xs">Queries (7d)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{analytics.ai.queriesLast7Days}</div>
            <p className="text-xs text-white/60 mt-1">Last week</p>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="pb-3"><CardTitle className="text-white text-xs">Tool Invocations</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{analytics.ai.toolCalls}</div>
            <p className="text-xs text-white/60 mt-1">AI actions</p>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="pb-3"><CardTitle className="text-white text-xs">Error Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{analytics.ai.errorRate}%</div>
            <p className="text-xs text-white/60 mt-1">{analytics.ai.errors} errors</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><FileText className="w-5 h-5" /> Document Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-white/70">Total Submissions</span>
              <span className="text-white font-semibold">{analytics.documents.total}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-white/70">Approved</span>
              <Badge className="bg-green-500">{analytics.documents.approved}</Badge>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-white/70">Pending</span>
              <Badge className="bg-yellow-500">{analytics.documents.pending}</Badge>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-white/70">Denied</span>
              <Badge className="bg-red-500">{analytics.documents.denied}</Badge>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-white/70">Approval Rate</span>
              <span className="text-green-400 font-semibold">{analytics.documents.approvalRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Avg Review Time</span>
              <span className="text-blue-400 font-semibold">{analytics.documents.avgReviewTime}h</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Submissions by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {CATEGORIES.map((cat) => (
              <div key={cat} className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-white/70 capitalize">{cat}</span>
                <Badge variant="outline" className="bg-white/10 text-white border-white/30">{analytics.submissionsByCategory[cat] || 0}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2"><Activity className="w-5 h-5" /> System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
              <div className="text-2xl font-bold text-white">{analytics.ai.totalResponses}</div>
              <div className="text-xs text-white/60">AI Responses</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <UserCheck className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <div className="text-2xl font-bold text-white">{analytics.users.activeUsers}</div>
              <div className="text-xs text-white/60">Active Users (7d)</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <div className="text-2xl font-bold text-white">{analytics.documents.total}</div>
              <div className="text-xs text-white/60">Total Documents</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}