import { base44 } from '@/api/base44Client';

/**
 * Deletes a PONPMReport and all of its ONTPerformanceRecord rows directly from
 * the browser using batched deleteMany calls (50 ids per call) — the same fast
 * method used on the Data Management page. Avoids backend function timeouts.
 *
 * onProgress(deletedSoFar) is called after each batch.
 * Returns the total number of ONT records deleted.
 */
export async function deleteReportWithRecordsClientSide(reportId, onProgress) {
  const CHUNK_SIZE = 50;
  const PAGE_SIZE = 500;
  let totalDeleted = 0;

  // Loop: fetch a page of record ids for this report, delete them in chunks,
  // repeat until no records remain.
  for (;;) {
    const records = await base44.entities.ONTPerformanceRecord.filter(
      { report_id: reportId },
      'id',
      PAGE_SIZE
    );
    if (records.length === 0) break;

    const ids = records.map(r => r.id);
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      await base44.entities.ONTPerformanceRecord.deleteMany({ id: { $in: chunk } });
      totalDeleted += chunk.length;
      onProgress?.(totalDeleted);
    }

    if (records.length < PAGE_SIZE) break;
  }

  // Finally remove the report itself
  await base44.entities.PONPMReport.delete(reportId);
  return totalDeleted;
}