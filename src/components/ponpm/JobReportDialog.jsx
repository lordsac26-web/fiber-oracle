import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Sparkles } from 'lucide-react';
import ReportForm from '@/components/jobreports/ReportForm';

export default function JobReportDialog({
  open,
  onOpenChange,
  generatingReport,
  jobReportFormData,
  setJobReportFormData,
  onSubmit,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Create Job Report - AI Pre-filled
          </DialogTitle>
          <DialogDescription className="sr-only">
            AI-generated job report for ONT maintenance.
          </DialogDescription>
        </DialogHeader>
        {generatingReport ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-gray-500">AI is analyzing ONT data and generating report...</p>
          </div>
        ) : jobReportFormData ? (
          <>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <Sparkles className="h-4 w-4 inline mr-1" />
                This report has been pre-filled with AI-generated diagnosis and recommendations based on ONT performance data. Review and adjust as needed.
              </p>
            </div>
            <ReportForm
              formData={jobReportFormData}
              setFormData={setJobReportFormData}
              onSubmit={onSubmit}
              onCancel={() => onOpenChange(false)}
              isEditing={false}
              isSubmitting={false}
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}