import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, Loader2, Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CertificationProgressCards from '@/components/certifications/CertificationProgressCards';
import DomainAverageChart from '@/components/certifications/DomainAverageChart';
import PerformanceTrendChart from '@/components/certifications/PerformanceTrendChart';
import NextStepsRoadmap from '@/components/certifications/NextStepsRoadmap';
import { CERTIFICATION_COURSES, getDomainAverages, getPassedCourseIds, getTrendData } from '@/components/certifications/dashboardData';
import { createPageUrl } from '@/utils';

export default function CertificationDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['certification-dashboard'],
    queryFn: async () => {
      const [certifications, progressRecords] = await Promise.all([
        base44.entities.Certification.list('-created_date', 100),
        base44.entities.CourseProgress.list('-updated_date', 50),
      ]);
      return { certifications, progressRecords };
    },
    initialData: { certifications: [], progressRecords: [] },
  });

  const certifications = data?.certifications || [];
  const progressRecords = data?.progressRecords || [];
  const passedCourseIds = getPassedCourseIds(certifications);
  const domainAverages = getDomainAverages(certifications);
  const trendData = getTrendData(certifications);
  const completedCount = CERTIFICATION_COURSES.filter(course => passedCourseIds.has(course.id)).length;
  const averageScore = certifications.length
    ? Math.round(certifications.reduce((sum, cert) => sum + Number(cert.score || 0), 0) / certifications.length)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <header className="sticky top-0 z-50 border-b border-white/40 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Education')}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Certification Dashboard</h1>
              <p className="text-xs text-slate-500">Track progress, domain mastery, and next steps</p>
            </div>
          </div>
          <Link to={createPageUrl('Education')}>
            <Button variant="outline">Education Center</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
                <Trophy className="h-4 w-4" /> Certification Pathway
              </div>
              <h2 className="text-3xl font-bold">Your Fiber Learning Progress</h2>
              <p className="mt-2 max-w-2xl text-indigo-100">
                Monitor Fiber 101, 102, and 103 certification progress, review domain-level exam performance, and see the next best step in your training path.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center md:min-w-72">
              <div className="rounded-2xl bg-white/15 p-4">
                <p className="text-3xl font-bold">{completedCount}/3</p>
                <p className="text-xs text-indigo-100">Certified</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-4">
                <p className="text-3xl font-bold">{averageScore || '—'}{averageScore ? '%' : ''}</p>
                <p className="text-xs text-indigo-100">Avg Score</p>
              </div>
            </div>
          </div>
        </section>

        {isLoading ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center justify-center gap-3 p-10 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading certification progress...
            </CardContent>
          </Card>
        ) : (
          <>
            <CertificationProgressCards
              courses={CERTIFICATION_COURSES}
              certifications={certifications}
              progressRecords={progressRecords}
              passedCourseIds={passedCourseIds}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <PerformanceTrendChart trendData={trendData} />
              <DomainAverageChart domainAverages={domainAverages} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <NextStepsRoadmap courses={CERTIFICATION_COURSES} certifications={certifications} passedCourseIds={passedCourseIds} />
              <Card className="border-0 shadow-lg">
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold">Performance Insight</h3>
                      <p className="text-sm text-slate-500">Lowest domains appear first.</p>
                    </div>
                  </div>
                  {domainAverages.slice(0, 3).map(domain => (
                    <div key={domain.domain} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{domain.domain}</span>
                        <span className={domain.average >= 80 ? 'text-emerald-600' : domain.average >= 70 ? 'text-amber-600' : 'text-red-600'}>{domain.average}%</span>
                      </div>
                    </div>
                  ))}
                  {domainAverages.length === 0 && <p className="text-sm text-slate-500">Take an exam to unlock personalized domain insights.</p>}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}