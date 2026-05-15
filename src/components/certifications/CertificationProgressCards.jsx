import React from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpen, CheckCircle2, Lock, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { createPageUrl } from '@/utils';
import { getBestCertification, getCourseAttempts, getCourseProgressPercent, isCourseUnlocked } from './dashboardData';

const colorClasses = {
  emerald: 'from-emerald-500 to-green-600',
  blue: 'from-blue-500 to-indigo-600',
  purple: 'from-purple-500 to-indigo-600',
};

export default function CertificationProgressCards({ courses, certifications, progressRecords, passedCourseIds }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {courses.map(course => {
        const best = getBestCertification(certifications, course.id);
        const attempts = getCourseAttempts(certifications, course.id);
        const studyProgress = getCourseProgressPercent(progressRecords, course.id);
        const unlocked = isCourseUnlocked(course, passedCourseIds);
        const certified = !!best?.passed;

        return (
          <Card key={course.id} className="overflow-hidden border-0 shadow-lg">
            <div className={`bg-gradient-to-r ${colorClasses[course.color]} p-5 text-white`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/70">Certification</p>
                  <h3 className="text-xl font-bold">{course.title}</h3>
                  <p className="text-sm text-white/80">{course.subtitle}</p>
                </div>
                {certified ? <CheckCircle2 className="h-7 w-7" /> : unlocked ? <Award className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
              </div>
            </div>
            <CardContent className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">Best Score</p>
                  <p className="text-2xl font-bold">{best ? `${best.score}%` : '—'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">Attempts</p>
                  <p className="text-2xl font-bold">{attempts.length}</p>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Course Progress</span>
                  <span>{studyProgress}%</span>
                </div>
                <Progress value={studyProgress} className="h-2" />
              </div>

              <div className="flex items-center justify-between">
                <Badge className={certified ? 'bg-emerald-100 text-emerald-700' : unlocked ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}>
                  {certified ? 'Certified' : unlocked ? 'Unlocked' : 'Locked'}
                </Badge>
                <span className="text-xs text-slate-500">Pass: {course.passingScore}%</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link to={createPageUrl(course.coursePage)}>
                  <Button variant="outline" size="sm" className="w-full gap-2" disabled={!unlocked}>
                    <BookOpen className="h-4 w-4" /> Study
                  </Button>
                </Link>
                <Link to={createPageUrl(course.examPage)}>
                  <Button size="sm" className="w-full gap-2" disabled={!unlocked}>
                    <RotateCcw className="h-4 w-4" /> Exam
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}