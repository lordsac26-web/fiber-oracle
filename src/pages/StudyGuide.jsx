import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StudyGuideComponent from '@/components/education/StudyGuide';

export default function StudyGuidePage() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course') || 'fiber101';

  const courseNames = {
    fiber101: 'Fiber 101',
    fiber102: 'Fiber 102',
    fiber103: 'Fiber 103'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Education')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold">{courseNames[courseId]} Study Guide</h1>
                <p className="text-xs text-gray-500">Reference Material for Certification Exam</p>
              </div>
            </div>
            <Link to={createPageUrl(`CertificationExam?course=${courseId}`)}>
              <Button>Take Exam</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <StudyGuideComponent courseId={courseId} />
      </main>
    </div>
  );
}