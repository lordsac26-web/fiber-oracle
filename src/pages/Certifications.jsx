import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Award, 
  Download, 
  CheckCircle2, 
  XCircle,
  Trophy,
  BookOpen,
  Clock,
  Target,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';

const COURSES = [
  { id: 'fiber101', title: 'Fiber 101', subtitle: 'Foundations of Fiber Optics', passingScore: 70, color: 'from-green-500 to-emerald-600' },
  { id: 'fiber102', title: 'Fiber 102', subtitle: 'Intermediate PON & FTTH', passingScore: 75, color: 'from-blue-500 to-indigo-600' },
  { id: 'fiber103', title: 'Fiber 103', subtitle: 'Advanced Troubleshooting', passingScore: 80, color: 'from-purple-500 to-indigo-600' },
];

export default function Certifications() {
  const { data: certifications = [], isLoading } = useQuery({
    queryKey: ['certifications'],
    queryFn: () => base44.entities.Certification.list('-created_date'),
  });

  const getCourseStatus = (courseId) => {
    const courseCerts = certifications.filter(c => c.course_id === courseId);
    const passed = courseCerts.find(c => c.passed);
    const latestAttempt = courseCerts[0];
    return { passed, latestAttempt, attempts: courseCerts.length };
  };

  const passedCount = COURSES.filter(c => getCourseStatus(c.id).passed).length;

  const downloadCertificate = (cert) => {
    const certWindow = window.open('', '_blank');
    certWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate - ${cert.course_title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Open+Sans:wght@400;600&display=swap');
          body { font-family: 'Open Sans', sans-serif; margin: 0; padding: 40px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; }
          .certificate { width: 900px; padding: 60px; background: white; border: 3px solid #1e3a8a; position: relative; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
          .certificate::before { content: ''; position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px; border: 2px solid #3b82f6; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: bold; color: #1e3a8a; margin-bottom: 10px; }
          .title { font-family: 'Playfair Display', serif; font-size: 48px; color: #1e3a8a; margin: 20px 0; }
          .recipient { font-family: 'Playfair Display', serif; font-size: 36px; color: #1e40af; margin: 30px 0; padding: 10px 0; border-bottom: 2px solid #3b82f6; display: inline-block; }
          .course-title { font-size: 24px; color: #1e3a8a; font-weight: 600; margin: 20px 0; }
          .details { font-size: 16px; color: #475569; line-height: 1.8; margin: 30px 0; }
          .score { font-size: 20px; color: #059669; font-weight: 600; }
          .footer { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 30px; border-top: 1px solid #e2e8f0; }
          .signature { text-align: center; }
          .signature-line { width: 200px; border-bottom: 1px solid #1e3a8a; margin: 10px auto; }
          .cert-id { font-size: 12px; color: #94a3b8; margin-top: 20px; }
          .seal { width: 100px; height: 100px; border: 3px solid #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; text-align: center; color: #f59e0b; font-weight: bold; }
          @media print { body { background: white; padding: 0; } .certificate { box-shadow: none; } }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/1652e0384_oracle.jpg" alt="Fiber Oracle" style="width: 80px; height: 80px; border-radius: 16px; margin: 0 auto 10px;" />
            <div class="logo">FIBER ORACLE</div>
            <div class="title">Certificate of Completion</div>
          </div>
          <div style="text-align: center;">
            <p style="font-size: 16px; color: #64748b;">This is to certify that</p>
            <div class="recipient">${cert.learner_name}</div>
            <p style="font-size: 16px; color: #64748b; margin-top: 20px;">has successfully completed</p>
            <div class="course-title">${cert.course_title}</div>
            <div class="details">
              <p class="score">Final Score: ${cert.score}%</p>
            </div>
          </div>
          <div class="footer">
            <div class="signature">
              <div class="signature-line"></div>
              <p>Fiber Oracle</p>
            </div>
            <div class="seal">CERTIFIED<br/>${cert.course_id.toUpperCase()}</div>
            <div class="signature">
              <div class="signature-line"></div>
              <p>${moment(cert.completion_date).format('MMMM D, YYYY')}</p>
            </div>
          </div>
          <div class="cert-id">Certificate ID: ${cert.certificate_id}</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    certWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Education')}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">My Certifications</h1>
              <p className="text-xs text-gray-500">Track your progress and achievements</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Progress Overview */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Trophy className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">Certification Progress</h2>
                <p className="text-indigo-100">{passedCount} of {COURSES.length} certifications earned</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{Math.round((passedCount / COURSES.length) * 100)}%</div>
                <div className="text-sm text-indigo-100">Complete</div>
              </div>
            </div>
            <Progress value={(passedCount / COURSES.length) * 100} className="mt-4 h-2 bg-white/20" />
          </div>
        </Card>

        {/* Course Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {COURSES.map((course) => {
            const status = getCourseStatus(course.id);
            return (
              <Card key={course.id} className="border-0 shadow-lg overflow-hidden">
                <div className={`bg-gradient-to-r ${course.color} p-4 text-white`}>
                  <h3 className="text-xl font-bold">{course.title}</h3>
                  <p className="text-sm opacity-80">{course.subtitle}</p>
                </div>
                <CardContent className="p-4 space-y-4">
                  {status.passed ? (
                    <>
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-semibold">Certified</span>
                        <Badge className="ml-auto bg-green-100 text-green-700">{status.passed.score}%</Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {moment(status.passed.completion_date).format('MMM D, YYYY')}
                        </div>
                        <div className="text-xs mt-1 font-mono">{status.passed.certificate_id}</div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => downloadCertificate(status.passed)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Certificate
                      </Button>
                    </>
                  ) : status.latestAttempt ? (
                    <>
                      <div className="flex items-center gap-2 text-amber-600">
                        <XCircle className="h-5 w-5" />
                        <span className="font-semibold">Not Yet Passed</span>
                        <Badge variant="outline" className="ml-auto">{status.attempts} attempt{status.attempts > 1 ? 's' : ''}</Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        Last score: {status.latestAttempt.score}% (needed {course.passingScore}%)
                      </div>
                      <Link to={createPageUrl(`CertificationExam?course=${course.id}`)}>
                        <Button className="w-full">
                          <Target className="h-4 w-4 mr-2" />
                          Retry Exam
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-gray-500">
                        <BookOpen className="h-5 w-5" />
                        <span>Not Started</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Pass score: {course.passingScore}%
                      </div>
                      <Link to={createPageUrl(`CertificationExam?course=${course.id}`)}>
                        <Button variant="outline" className="w-full">
                          <ChevronRight className="h-4 w-4 mr-2" />
                          Take Exam
                        </Button>
                      </Link>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Exam History */}
        {certifications.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Exam History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {certifications.map((cert) => (
                  <div 
                    key={cert.id} 
                    className={`flex items-center justify-between p-3 rounded-xl ${cert.passed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}
                  >
                    <div className="flex items-center gap-3">
                      {cert.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <div className="font-medium">{cert.course_title}</div>
                        <div className="text-xs text-gray-500">
                          {moment(cert.created_date).format('MMM D, YYYY h:mm A')} • {cert.learner_name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={cert.passed ? 'bg-green-500' : 'bg-red-500'}>
                        {cert.score}%
                      </Badge>
                      {cert.passed && (
                        <Button variant="ghost" size="sm" onClick={() => downloadCertificate(cert)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="text-center py-12 text-gray-500">Loading certifications...</div>
        )}
      </main>
    </div>
  );
}