import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import LossBudgetCalculator from '@/components/fiber/LossBudgetCalculator';
import { toast } from 'sonner';
import ToolGuide from '@/components/tools/ToolGuide';
import { getToolGuide } from '@/components/tools/toolGuides';

export default function LossBudget() {
  const [showGuide, setShowGuide] = useState(false);
  const guide = getToolGuide('lossBudget');
  const handleSaveReport = (reportData) => {
    // Generate report content
    const report = reportData.data;
    const calc = report.calculations;
    const timestamp = new Date().toLocaleString();
    
    const reportText = `LOSS BUDGET REPORT
Generated: ${timestamp}
================================

LINK CONFIGURATION
------------------
Standard: ${report.selectedStandard}
Fiber Type: ${report.fiberType}
Wavelength: ${report.wavelength}
Distance: ${report.distance} km
Connectors: ${report.connectors} (${report.connectorGrade})
Splices: ${report.splices} (${report.spliceType})
Safety Margin: ${report.safetyMargin} dB

LOSS BREAKDOWN
--------------
Fiber Loss: ${calc.fiberLoss} dB
Connector Loss: ${calc.totalConnectorLoss} dB
Splice Loss: ${calc.totalSpliceLoss} dB
Safety Margin: ${report.safetyMargin} dB
--------------------------------
TOTAL LOSS: ${calc.totalWithMargin} dB

RESULT
------
Budget: ${calc.budget} dB
Status: ${calc.status.toUpperCase()}
Margin: ${calc.remaining} dB
Utilization: ${calc.utilizationPercent}%

================================
Values per TIA-568-D / IEEE 802.3
`;

    // Create and download file
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loss_budget_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Report downloaded');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <ToolGuide guide={guide} isOpen={showGuide} onClose={() => setShowGuide(false)} />
      
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Loss Budget Calculator</h1>
                <p className="text-xs text-gray-500">TIA-568-D / IEEE 802.3</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(true)}
              className="gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Guide</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <LossBudgetCalculator onSaveReport={handleSaveReport} />
      </main>
    </div>
  );
}