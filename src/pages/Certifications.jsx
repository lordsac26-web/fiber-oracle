import React, { useState } from 'react';
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
  FileText,
  Loader2,
  WifiOff
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { saveDocumentOffline, isDocumentSavedOffline } from '@/components/OfflineDocumentService';
import { toast } from 'sonner';

const COURSE_INFO = {
  fiber101: { title: 'Fiber 101', subtitle: 'Foundations of Fiber Optics', color: 'from-green-500 to-emerald-600' },
  fiber102: { title: 'Fiber 102', subtitle: 'Intermediate PON & FTTH', color: 'from-blue-500 to-indigo-600' },
  fiber103: { title: 'Fiber 103', subtitle: 'Advanced Troubleshooting', color: 'from-purple-500 to-indigo-600' },
};

export default function Certifications() {
  const [downloadingId, setDownloadingId] = useState(null);
  const [offlineCerts, setOfflineCerts] = useState({});
  
  const { data: certifications = [], isLoading } = useQuery({
    queryKey: ['certifications'],
    queryFn: () => base44.entities.Certification.list('-created_date'),
  });

  // Check which certificates are saved offline
  React.useEffect(() => {
    const checkOffline = async () => {
      const status = {};
      for (const cert of certifications) {
        status[cert.id] = await isDocumentSavedOffline(`certificate-${cert.id}`);
      }
      setOfflineCerts(status);
    };
    if (certifications.length > 0) {
      checkOffline();
    }
  }, [certifications]);

  const downloadCertificate = async (cert) => {
    const courseInfo = COURSE_INFO[cert.course_id] || { title: cert.course_title, subtitle: '' };
    setDownloadingId(cert.id);
    
    try {
      const response = await base44.functions.invoke('generatePDF', { 
        type: 'certificate',
        data: {
          learnerName: cert.learner_name,
          courseTitle: courseInfo.title,
          courseSubtitle: courseInfo.subtitle,
          score: cert.score,
          certificateId: cert.certificate_id,
          completionDate: cert.completion_date,
          courseId: cert.course_id
        }
      }, { responseType: 'arraybuffer' });
      
      // Save for offline access
      await saveDocumentOffline(
        `certificate-${cert.id}`,
        'certificate',
        `${courseInfo.title} Certificate - ${cert.learner_name}`,
        response.data,
        { 
          courseId: cert.course_id, 
          learnerName: cert.learner_name,
          certificateId: cert.certificate_id,
          score: cert.score
        }
      );
      setOfflineCerts(prev => ({ ...prev, [cert.id]: true }));
      toast.success('Certificate saved for offline access');
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate-${courseInfo.title}-${cert.learner_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Certificate download failed:', error);
      toast.error('Failed to download certificate');
    } finally {
      setDownloadingId(null);
    }
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
                      <div className="flex items-center gap-2">
                        {offlineCerts[cert.id] && (
                          <Badge className="bg-emerald-500/80 text-white border-0">
                            <WifiOff className="h-3 w-3 mr-1" />
                            Offline
                          </Badge>
                        )}
                        {cert.passed && (
                          <Badge className="bg-white/20 text-white border-0">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Passed
                          </Badge>
                        )}
                      </div>
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
                      disabled={downloadingId === cert.id}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600"
                    >
                      {downloadingId === cert.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {downloadingId === cert.id ? 'Generating...' : 'Download Certificate'}
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