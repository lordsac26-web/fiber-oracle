import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { downloadPdfFromFunction } from '@/lib/pdfDownload';
import { safeCertificateFilename } from '@/lib/certificationUtils';

export default function CertificateDownloadButton({ certification, courseInfo, className = '', size = 'default', children }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!certification) return;
    setIsDownloading(true);
    try {
      const courseTitle = courseInfo?.title || certification.course_title || 'Fiber Certification';
      const courseSubtitle = courseInfo?.subtitle || 'Professional Certification';

      await downloadPdfFromFunction('generatePDF', {
        type: 'certificate',
        data: {
          learnerName: certification.learner_name,
          courseTitle,
          courseSubtitle,
          score: certification.score,
          certificateId: certification.certificate_id,
          completionDate: certification.completion_date,
          courseId: certification.course_id,
        },
      }, safeCertificateFilename(courseTitle, certification.learner_name));

      toast.success('Certificate downloaded successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to download certificate');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={isDownloading || !certification} size={size} className={className}>
      {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
      {children || (isDownloading ? 'Generating...' : 'Download Certificate')}
    </Button>
  );
}