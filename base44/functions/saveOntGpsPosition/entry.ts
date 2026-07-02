import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

/**
 * Save a user-corrected GPS position for an ONT record.
 * Payload: { recordId: string, lat: number, lng: number }
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

  const { recordId, lat, lng } = await req.json();

  if (!recordId || typeof lat !== 'number' || typeof lng !== 'number') {
    return Response.json({ error: 'recordId, lat, and lng are required' }, { status: 400 });
  }

  if (!isFinite(lat) || !isFinite(lng)) {
    return Response.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  try {
    await base44.asServiceRole.entities.ONTPerformanceRecord.update(recordId, {
      gps_lat: lat,
      gps_lng: lng,
      gps_manual: true,
    });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to update record' }, { status: 500 });
  }
});