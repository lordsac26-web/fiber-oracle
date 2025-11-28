import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import OTDRWizard from '../components/fiber/OTDRWizard';

export default function OTDRTest() {
  const handleSaveReport = (report) => {
    // Generate report text
    const data = report.data;
    const calc = data.calculations;
    
    const reportText = `
OTDR TIER-2 TEST REPORT
========================
Date: ${new Date().toLocaleString()}
Cable ID: ${data.cableId || 'N/A'}
Fiber: ${data.fiberNumber || 'N/A'}
Fiber Type: ${data.fiberType}
Wavelength: ${data.wavelength}
Pulse Width: ${data.pulseWidth}

TRACE SUMMARY
-------------
A→B Length: ${data.traceAB.totalLength} km
A→B Loss: ${data.traceAB.totalLoss} dB
A→B Attenuation: ${data.traceAB.avgAttenuation} dB/km

B→A Length: ${data.traceBA.totalLength} km
B→A Loss: ${data.traceBA.totalLoss} dB
B→A Attenuation: ${data.traceBA.avgAttenuation} dB/km

AVERAGED RESULTS
----------------
Average Length: ${calc.avgLength} km
Average Total Loss: ${calc.avgTotalLoss} dB

EVENT TABLE
-----------
${calc.events.map(e => 
  `${e.distance}km - ${e.type}: A→B ${e.lossAB || '-'}dB, B→A ${e.lossBA || '-'}dB, Avg ${e.avgLoss?.toFixed(2)}dB [${e.status.toUpperCase()}]`
).join('\n')}

OVERALL RESULT: ${calc.overallStatus.toUpperCase()}
- Passed Events: ${calc.passedEvents}
- Marginal Events: ${calc.marginalEvents}
- Failed Events: ${calc.failedEvents}

Standards Reference: TIA-568-D, TIA-526-14-C
    `.trim();

    // Download as file
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OTDR_Report_${data.cableId || 'test'}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('OTDR report saved!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">OTDR Tier-2 Test</h1>
              <p className="text-xs text-gray-500">Bidirectional trace characterization</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <OTDRWizard onSaveReport={handleSaveReport} />
      </main>
    </div>
  );
}