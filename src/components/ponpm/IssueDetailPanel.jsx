import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from 'lucide-react';

/**
 * Expandable panel showing critical issues or warnings from the FILTERED ONT set.
 * Respects active global/local filters so displayed issues match what the user sees.
 */
export default function IssueDetailPanel({ issueDetailView, filteredOnts, onClose }) {
  if (!issueDetailView) return null;

  const matchingOnts = filteredOnts.filter(ont => {
    const matchesType = issueDetailView.type === 'critical'
      ? ont._analysis.issues.length > 0
      : ont._analysis.warnings.length > 0;
    const matchesOlt = !issueDetailView.oltName || ont._oltName === issueDetailView.oltName;
    const matchesPort = !issueDetailView.portKey || ont._port === issueDetailView.portKey;
    return matchesType && matchesOlt && matchesPort;
  });

  return (
    <Card className={`border-2 ${issueDetailView.type === 'critical' ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-amber-300 bg-amber-50 dark:bg-amber-900/20'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${issueDetailView.type === 'critical' ? 'text-red-800' : 'text-amber-800'}`}>
            {issueDetailView.type === 'critical' ? <AlertCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            {issueDetailView.type === 'critical' ? 'Critical Issues' : 'Warnings'}
            {issueDetailView.oltName && <span className="text-sm font-normal">— {issueDetailView.oltName}</span>}
            {issueDetailView.portKey && <span className="text-sm font-normal">/ {issueDetailView.portKey}</span>}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {matchingOnts.map((ont, idx) => {
            const issues = issueDetailView.type === 'critical' ? ont._analysis.issues : ont._analysis.warnings;
            return (
              <div key={idx} className="p-3 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm">
                    <span className="text-gray-500">{ont._oltName} / {ont._port} /</span> ONT {ont.OntID}
                  </div>
                  <span className="font-mono text-xs text-gray-500">{ont.SerialNumber}</span>
                </div>
                <div className="space-y-1">
                  {issues.map((issue, i) => (
                    <div key={i} className={`text-sm p-2 rounded ${issueDetailView.type === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{issue.field}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-white/70 px-1.5 py-0.5 rounded font-bold">{issue.value}</span>
                          {issue.threshold && (
                            <span className="font-mono text-xs text-gray-600 bg-white/50 px-1.5 py-0.5 rounded">
                              Threshold: {issue.threshold}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs opacity-80">{issue.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {matchingOnts.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No {issueDetailView.type === 'critical' ? 'critical issues' : 'warnings'} found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}