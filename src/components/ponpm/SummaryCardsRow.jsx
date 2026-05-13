import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Wifi } from 'lucide-react';

/**
 * Top-level summary cards: Total ONTs, Critical, Warning, Offline, Healthy, OLTs, eero.
 * Clicking Critical/Warning toggles the issue detail panel; Offline/OK toggle statusFilter.
 */
export default function SummaryCardsRow({
  summary,
  ontsWithTrendsCount,
  eeroMatchCount,
  issueDetailView,
  setIssueDetailView,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <div className={`grid grid-cols-2 ${eeroMatchCount > 0 ? 'md:grid-cols-7' : 'md:grid-cols-6'} gap-3`}>
      <Card className="border-0 shadow">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalOnts}</div>
          <div className="text-xs text-gray-500">Total ONTs</div>
          {ontsWithTrendsCount > 0 && (
            <Badge variant="outline" className="text-[10px] mt-1 bg-blue-50 text-blue-700 border-blue-300">
              <TrendingUp className="h-2 w-2 mr-1" />
              {ontsWithTrendsCount} with trends
            </Badge>
          )}
        </CardContent>
      </Card>
      <Card
        className={`border-0 shadow cursor-pointer transition-all hover:ring-2 hover:ring-red-300 ${issueDetailView?.type === 'critical' && !issueDetailView?.oltName ? 'ring-2 ring-red-500' : ''}`}
        onClick={() => setIssueDetailView(issueDetailView?.type === 'critical' && !issueDetailView?.oltName ? null : { type: 'critical' })}
      >
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{summary.criticalCount}</div>
          <div className="text-xs text-gray-500">Critical</div>
        </CardContent>
      </Card>
      <Card
        className={`border-0 shadow cursor-pointer transition-all hover:ring-2 hover:ring-amber-300 ${issueDetailView?.type === 'warning' && !issueDetailView?.oltName ? 'ring-2 ring-amber-500' : ''}`}
        onClick={() => setIssueDetailView(issueDetailView?.type === 'warning' && !issueDetailView?.oltName ? null : { type: 'warning' })}
      >
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{summary.warningCount}</div>
          <div className="text-xs text-gray-500">Warnings</div>
        </CardContent>
      </Card>
      <Card
        className={`border-0 shadow cursor-pointer transition-all hover:ring-2 hover:ring-purple-300 ${statusFilter === 'offline' ? 'ring-2 ring-purple-500' : ''}`}
        onClick={() => { setStatusFilter(statusFilter === 'offline' ? 'all' : 'offline'); setIssueDetailView(null); }}
      >
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{summary.offlineCount || 0}</div>
          <div className="text-xs text-gray-500">Offline</div>
        </CardContent>
      </Card>
      <Card
        className={`border-0 shadow cursor-pointer transition-all hover:ring-2 hover:ring-green-300 ${statusFilter === 'ok' ? 'ring-2 ring-green-500' : ''}`}
        onClick={() => { setStatusFilter(statusFilter === 'ok' ? 'all' : 'ok'); setIssueDetailView(null); }}
      >
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{summary.okCount}</div>
          <div className="text-xs text-gray-500">Healthy</div>
        </CardContent>
      </Card>
      <Card className="border-0 shadow">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{summary.oltCount}</div>
          <div className="text-xs text-gray-500">OLTs</div>
        </CardContent>
      </Card>
      {eeroMatchCount > 0 && (
        <Card className="border-0 shadow">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{eeroMatchCount}</div>
            <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <Wifi className="h-3 w-3 text-emerald-500" />
              w/ eero
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}