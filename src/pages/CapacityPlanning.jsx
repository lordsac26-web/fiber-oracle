import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Cable, TrendingUp, Cloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import UtilizationDashboard from '@/components/capacity/UtilizationDashboard';

export default function CapacityPlanning() {
  const { data: lcpEntries = [], isLoading: loadingLcp } = useQuery({
    queryKey: ['lcpEntries'],
    queryFn: () => base44.entities.LCPEntry.list('-created_date', 5000),
  });

  const { data: latestLcpCountData = null, isLoading: loadingCounts } = useQuery({
    queryKey: ['latestPonPmOntCounts'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getLatestLcpOntCounts', {});
      return response.data || null;
    },
  });

  const ontCountsByKey = latestLcpCountData?.counts || {};
  const reportInfo = latestLcpCountData?.report || null;
  const isLoading = loadingLcp || loadingCounts;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Splitter Utilization</h1>
                <p className="text-xs text-gray-500">LCP / CLCP capacity overview</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to={createPageUrl('LCPInfo')}>
                <Button variant="outline" size="sm">
                  <Cable className="h-4 w-4 mr-2" />
                  LCP Database
                </Button>
              </Link>
              <Link to={createPageUrl('PONPMAnalysis')}>
                <Button variant="outline" size="sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  PON PM
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Report source banner */}
        {reportInfo && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
            <Cloud className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Data source:</strong> {reportInfo.report_name}
            </div>
          </div>
        )}

        {isLoading ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-600">Loading utilization data...</h3>
            </CardContent>
          </Card>
        ) : !reportInfo ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">No PON PM data available</h3>
              <p className="text-sm text-gray-500 mt-1">
                Upload a PON PM report to see splitter utilization.
              </p>
              <Link to={createPageUrl('PONPMAnalysis')}>
                <Button className="mt-4">Go to PON PM Analysis</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <UtilizationDashboard lcpEntries={lcpEntries} ontCountsByKey={ontCountsByKey} />
        )}
      </main>
    </div>
  );
}