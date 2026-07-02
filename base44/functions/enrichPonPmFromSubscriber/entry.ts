import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

/**
 * Enriches ONTPerformanceRecord table with corrected ONT serial numbers and models
 * from uploaded subscriber data.
 * 
 * Strategy: Match by OntID (the field is identical between PON PM and subscriber CSV).
 * For each subscriber record, find all ONTPerformanceRecords with matching OntID and
 * overwrite their serial_number and model fields with the authoritative subscriber values.
 * 
 * This ensures the database reflects the correct hardware models and serial numbers,
 * which then cascade to all downstream analytics, exports, and reports.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role === 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { subscriberRecords } = await req.json();
    if (!Array.isArray(subscriberRecords) || subscriberRecords.length === 0) {
      return Response.json({ error: 'subscriberRecords array required' }, { status: 400 });
    }

    // Group subscriber records by OntID for efficient lookup
    const subByOntId = new Map();
    for (const sub of subscriberRecords) {
      const ontId = String(sub.OntID || '').trim();
      if (ontId) {
        // Only store the first record per OntID (avoid conflicts)
        if (!subByOntId.has(ontId)) {
          subByOntId.set(ontId, sub);
        }
      }
    }

    if (subByOntId.size === 0) {
      return Response.json({ updated: 0, message: 'No valid OntID values in subscriber data' });
    }

    // Fetch ONTPerformanceRecords with matching OntIDs
    const ontIds = Array.from(subByOntId.keys());
    const pageSize = 1000;
    let totalUpdated = 0;
    let offset = 0;

    while (true) {
      const records = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { ont_id: { $in: ontIds } },
        '-updated_date',
        pageSize,
        offset
      );

      if (!records || records.length === 0) break;

      // Batch update: for each record, check if subscriber data exists for its OntID
      const updates = [];
      for (const record of records) {
        const ontId = String(record.ont_id || '').trim();
        const sub = subByOntId.get(ontId);

        if (sub) {
          const normSerialNo = (sub.ONTSerialNo || '').trim();
          const normModel = (sub.ONTModel || '').trim();

          // Only update if subscriber provides values
          if (normSerialNo || normModel) {
            updates.push(
              base44.asServiceRole.entities.ONTPerformanceRecord.update(record.id, {
                ...(normSerialNo && { serial_number: normSerialNo }),
                ...(normModel && { model: normModel })
              })
            );
          }
        }
      }

      // Execute all updates in parallel
      if (updates.length > 0) {
        await Promise.all(updates);
        totalUpdated += updates.length;
      }

      if (records.length < pageSize) break;
      offset += pageSize;
    }

    return Response.json({
      updated: totalUpdated,
      message: `Updated ${totalUpdated} ONT records with subscriber serial numbers and models`
    });
  } catch (error) {
    console.error('enrichPonPmFromSubscriber error:', error);
    return Response.json(
      { error: error.message || 'Enrichment failed' },
      { status: 500 }
    );
  }
});