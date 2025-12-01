import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Award, 
  Download, 
  Calendar,
  CheckCircle2,
  Trophy,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const COURSE_INFO = {
  fiber101: { title: 'Fiber 101', subtitle: 'Foundations of Fiber Optics', color: 'from-green-500 to-emerald-600' },
  fiber102: { title: 'Fiber 102', subtitle: 'Intermediate PON & FTTH', color: 'from-blue-500 to-indigo-600' },
  fiber103: { title: 'Fiber 103', subtitle: 'Advanced Troubleshooting', color: 'from-purple-500 to-indigo-600' },
};

export default function Certifications() {
  const { data: certifications = [], isLoading } = useQuery({
    queryKey: ['certifications'],
    queryFn: () => base44.entities.Certification.list('-created_date'),
  });

  const downloadCertificate = (cert) => {
    const courseInfo = COURSE_INFO[cert.course_id] || { title: cert.course_title, subtitle: '' };
    const certWindow = window.open('', '_blank');
    certWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate of Completion</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Open+Sans:wght@400;600&display=swap');
          
          body { 
            font-family: 'Open Sans', sans-serif; 
            margin: 0; 
            padding: 40px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f5f5f5;
          }
          
          .certificate {
            width: 900px;
            padding: 60px;
            background: white;
            border: 3px solid #1e3a8a;
            position: relative;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          
          .certificate::before {
            content: '';
            position: absolute;
            top: 10px;
            left: 10px;
            right: 10px;
            bottom: 10px;
            border: 2px solid #3b82f6;
          }
          
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: bold; color: #1e3a8a; margin-bottom: 10px; }
          .title { font-family: 'Playfair Display', serif; font-size: 48px; color: #1e3a8a; margin: 20px 0; }
          .subtitle { font-size: 18px; color: #64748b; margin-bottom: 30px; }
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
            <div class="subtitle">Education & Certification Center</div>
            <div class="title">Certificate of Completion</div>
          </div>
          
          <div style="text-align: center;">
            <p style="font-size: 16px; color: #64748b;">This is to certify that</p>
            <div class="recipient">${cert.learner_name}</div>
            <p style="font-size: 16px; color: #64748b; margin-top: 20px;">has successfully completed</p>
            <div class="course-title">${courseInfo.title}</div>
            <p style="font-size: 14px; color: #64748b;">${courseInfo.subtitle}</p>
            
            <div class="details">
              <p>This certifies that the above-named individual has successfully demonstrated 
              knowledge and understanding of fiber optic technology, PON networks, and FTTH 
              installation and troubleshooting by achieving a passing score on the final assessment.</p>
              <p class="score">Final Score: ${cert.score}%</p>
            </div>
          </div>
          
          <div class="footer">
            <div class="signature">
              <div class="signature-line"></div>
              <p>Fiber Oracle</p>
              <p style="font-size: 12px; color: #64748b;">Certification Authority</p>
            </div>
            
            <div class="seal">
              CERTIFIED<br/>
              ${cert.course_id?.toUpperCase() || 'FIBER'}
            </div>
            
            <div class="signature">
              <div class="signature-line"></div>
              <p>${cert.completion_date ? new Date(cert.completion_date).toLocaleDateString() : 'N/A'}</p>
              <p style="font-size: 12px; color: #64748b;">Date of Completion</p>
            </div>
          </div>
          
          <div class="cert-id">
            Certificate ID: ${cert.certificate_id} | Verify at fiberoracle.com/verify
          </div>
        </div>
        
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    certWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Education')}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">My Certifications</h1>
              <p className="text-xs text-gray-500">View and download your earned certificates</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header Card */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-8 text-white text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Certification Center</h2>
            <p className="text-indigo-100 mt-2">Your earned certificates and achievements</p>
          </div>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading certifications...</p>
          </div>
        ) : certifications.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Certifications Yet</h3>
              <p className="text-gray-500 mb-6">
                Complete a course exam to earn your first certification.
              </p>
              <Link to={createPageUrl('Education')}>
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
                  <FileText className="h-4 w-4 mr-2" />
                  Browse Courses
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {certifications.map((cert) => {
              const courseInfo = COURSE_INFO[cert.course_id] || { 
                title: cert.course_title || 'Unknown Course', 
                subtitle: '', 
                color: 'from-gray-500 to-gray-600' 
              };
              
              return (
                <Card key={cert.id} className="border-0 shadow-lg overflow-hidden">
                  <div className={`bg-gradient-to-r ${courseInfo.color} p-4 text-white`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Award className="h-8 w-8" />
                        <div>
                          <h3 className="font-bold text-lg">{courseInfo.title}</h3>
                          <p className="text-white/80 text-sm">{courseInfo.subtitle}</p>
                        </div>
                      </div>
                      {cert.passed && (
                        <Badge className="bg-white/20 text-white border-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Passed
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Learner</p>
                        <p className="font-semibold">{cert.learner_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Score</p>
                        <p className="font-semibold text-green-600">{cert.score}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Date</p>
                        <p className="font-semibold flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {cert.completion_date ? new Date(cert.completion_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Certificate ID</p>
                        <p className="font-mono text-xs">{cert.certificate_id}</p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => downloadCertificate(cert)}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Certificate
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}