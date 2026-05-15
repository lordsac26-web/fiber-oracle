import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { getBestCertification, isCourseUnlocked } from './dashboardData';

export default function NextStepsRoadmap({ courses, certifications, passedCourseIds }) {
  const nextCourse = courses.find(course => isCourseUnlocked(course, passedCourseIds) && !getBestCertification(certifications, course.id)?.passed);
  const allCertified = courses.every(course => getBestCertification(certifications, course.id)?.passed);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Next Steps Roadmap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          {courses.map(course => {
            const certified = !!getBestCertification(certifications, course.id)?.passed;
            const unlocked = isCourseUnlocked(course, passedCourseIds);
            const Icon = certified ? CheckCircle2 : unlocked ? Circle : Lock;

            return (
              <div key={course.id} className="flex items-center gap-3 rounded-xl border bg-white p-4 dark:bg-slate-900">
                <Icon className={certified ? 'h-5 w-5 text-emerald-600' : unlocked ? 'h-5 w-5 text-blue-600' : 'h-5 w-5 text-slate-400'} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{course.title}</p>
                  <p className="text-sm text-slate-500">
                    {certified ? 'Completed and certified' : unlocked ? 'Unlocked — continue studying or take the exam' : `Locked until ${course.prerequisite?.replace('fiber', 'Fiber ')} is passed`}
                  </p>
                </div>
                {unlocked && !certified && (
                  <Link to={createPageUrl(course.examPage)}>
                    <Button size="sm" className="gap-2">
                      Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 p-5 dark:from-indigo-900/20 dark:to-purple-900/20">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Recommended next action</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {allCertified
              ? 'All certification modules are complete. Keep skills sharp by reviewing Fiber 103 and using Fiber Doctor for live troubleshooting practice.'
              : nextCourse
                ? `Focus on ${nextCourse.title}: review the study guide, complete the course material, then take the certification exam.`
                : 'Start with Fiber 101 to unlock the certification pathway.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {allCertified ? (
              <Link to={createPageUrl('FiberDoctor')}><Button>Open Fiber Doctor</Button></Link>
            ) : nextCourse ? (
              <>
                <Link to={createPageUrl(nextCourse.studyGuidePage)}><Button variant="outline">Study Guide</Button></Link>
                <Link to={createPageUrl(nextCourse.coursePage)}><Button>Open Course</Button></Link>
              </>
            ) : (
              <Link to={createPageUrl('Fiber101')}><Button>Start Fiber 101</Button></Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}