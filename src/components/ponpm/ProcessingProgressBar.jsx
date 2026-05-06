import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, AlertTriangle, Database } from 'lucide-react';

/**
 * Displays a real-time progress banner while the backend is asynchronously
 * saving ONT records after a CSV upload.
 *
 * Props:
 *  - status: 'saving' | 'completed' | 'failed' | 'pending' | null
 *  - progress: 0-100
 *  - savedCount: number of records saved so far
 *  - totalCount: total ONT count from parse result
 *  - reportName: optional — name of the report being indexed (shown when the
 *      banner is driven from useProcessingReports across the app, so the user
 *      knows WHICH report is still processing)
 */
export default function ProcessingProgressBar({ status, progress, savedCount, totalCount, reportName }) {
  if (!status) return null;
  // Treat 'pending' as in-flight too — the automation hasn't picked it up yet.
  const inFlight = status === 'pending' || status === 'saving';

  const isComplete = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <Card className={`border-2 ${
      isFailed ? 'border-red-300 bg-red-50' :
      isComplete ? 'border-green-300 bg-green-50' :
      'border-blue-300 bg-blue-50'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {isFailed ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${
                isFailed ? 'text-red-800' : isComplete ? 'text-green-800' : 'text-blue-800'
              }`}>
                {isFailed
                  ? 'ONT indexing failed — live analysis is still available'
                  : isComplete
                  ? `ONT records fully indexed (${totalCount?.toLocaleString() ?? savedCount?.toLocaleString()} records)`
                  : `Indexing ONT records in the background${reportName ? ` — ${reportName}` : ''}…`}
              </span>
              {!isFailed && (
                <span className={`text-sm font-mono ${isComplete ? 'text-green-700' : 'text-blue-700'}`}>
                  {Math.round(progress)}%
                </span>
              )}
            </div>

            {!isFailed && (
              <Progress
                value={progress}
                className={`h-2 ${isComplete ? '[&>div]:bg-green-500' : '[&>div]:bg-blue-500'}`}
              />
            )}

            {inFlight && !isComplete && !isFailed && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-blue-600">
                  <Database className="h-3 w-3" />
                  <span>
                    {savedCount?.toLocaleString() ?? 0}
                    {totalCount ? ` / ${totalCount.toLocaleString()}` : ''} records saved
                    {' '}— you can continue using the analysis below
                  </span>
                </div>
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  ⚠️ Please wait for indexing to finish before uploading another report —
                  uploading now can cause rate-limit errors and slow loads.
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}