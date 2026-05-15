export function generateCertificateId(courseId) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomValues = new Uint32Array(2);
  crypto.getRandomValues(randomValues);
  const randomPart = Array.from(randomValues)
    .map(value => value.toString(36).toUpperCase().padStart(7, '0'))
    .join('')
    .slice(0, 10);

  return `FO-${String(courseId || 'CERT').toUpperCase()}-${datePart}-${randomPart}`;
}

export function safeCertificateFilename(courseTitle, learnerName) {
  return `Certificate-${courseTitle || 'Course'}-${learnerName || 'Learner'}`
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') + '.pdf';
}