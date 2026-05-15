export const CERTIFICATION_COURSES = [
  {
    id: 'fiber101',
    title: 'Fiber 101',
    subtitle: 'Foundations of Fiber Optics',
    passingScore: 70,
    coursePage: 'Fiber101',
    examPage: 'CertificationExam?course=fiber101',
    studyGuidePage: 'StudyGuide?course=fiber101',
    order: 1,
    color: 'emerald',
  },
  {
    id: 'fiber102',
    title: 'Fiber 102',
    subtitle: 'Intermediate PON & FTTH',
    passingScore: 75,
    coursePage: 'Fiber102',
    examPage: 'CertificationExam?course=fiber102',
    studyGuidePage: 'StudyGuide?course=fiber102',
    order: 2,
    prerequisite: 'fiber101',
    color: 'blue',
  },
  {
    id: 'fiber103',
    title: 'Fiber 103',
    subtitle: 'Advanced Troubleshooting Mastery',
    passingScore: 80,
    coursePage: 'Fiber103',
    examPage: 'CertificationExam?course=fiber103',
    studyGuidePage: 'StudyGuide?course=fiber103',
    order: 3,
    prerequisite: 'fiber102',
    color: 'purple',
  },
];

export const getPassedCourseIds = (certifications = []) => new Set(
  certifications.filter(cert => cert.passed).map(cert => cert.course_id)
);

export const getCourseAttempts = (certifications = [], courseId) =>
  certifications
    .filter(cert => cert.course_id === courseId)
    .sort((a, b) => new Date(a.completion_date || a.created_date) - new Date(b.completion_date || b.created_date));

export const getBestCertification = (certifications = [], courseId) => {
  const attempts = getCourseAttempts(certifications, courseId);
  if (!attempts.length) return null;
  return attempts.reduce((best, current) => (Number(current.score || 0) > Number(best.score || 0) ? current : best), attempts[0]);
};

export const getLatestCertification = (certifications = [], courseId) => {
  const attempts = getCourseAttempts(certifications, courseId);
  return attempts[attempts.length - 1] || null;
};

export const getCourseProgressPercent = (progressRecords = [], courseId) => {
  const progress = progressRecords.find(record => record.course_id === courseId);
  if (!progress) return 0;
  if (progress.completed) return 100;
  const current = Number(progress.current_slide || 0) + 1;
  const total = Number(progress.total_slides || 1);
  return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
};

export const getDomainAverages = (certifications = []) => {
  const domains = new Map();

  certifications.forEach(cert => {
    Object.entries(cert.domain_scores || {}).forEach(([domain, score]) => {
      const correct = Number(score?.correct || 0);
      const total = Number(score?.total || 0);
      if (!total) return;
      const existing = domains.get(domain) || { domain, correct: 0, total: 0, attempts: 0 };
      domains.set(domain, {
        domain,
        correct: existing.correct + correct,
        total: existing.total + total,
        attempts: existing.attempts + 1,
      });
    });
  });

  return Array.from(domains.values())
    .map(item => ({
      ...item,
      average: Math.round((item.correct / item.total) * 100),
    }))
    .sort((a, b) => a.average - b.average || a.domain.localeCompare(b.domain));
};

export const getTrendData = (certifications = []) => certifications
  .slice()
  .sort((a, b) => new Date(a.completion_date || a.created_date) - new Date(b.completion_date || b.created_date))
  .map((cert, index) => ({
    attempt: index + 1,
    course: CERTIFICATION_COURSES.find(course => course.id === cert.course_id)?.title || cert.course_id,
    score: Number(cert.score || 0),
    passingScore: CERTIFICATION_COURSES.find(course => course.id === cert.course_id)?.passingScore || 70,
    date: cert.completion_date || cert.created_date,
    passed: !!cert.passed,
  }));

export const isCourseUnlocked = (course, passedCourseIds) => !course.prerequisite || passedCourseIds.has(course.prerequisite);