/**
 * syncSubscriberToOntRecords
 *
 * Canonical subscriber → ONTPerformanceRecord synchronization path.
 *
 * Purpose:
 * - Uses ONLY the currently-active SubscriberUploadMeta generation.
 * - Reads both subscriber and ONT records with stable `id` pagination.
 * - Applies one normalized matching strategy everywhere.
 * - Updates subscriber display fields, authoritative model, and persisted technology_type.
 * - Optionally auto-continues in slices to avoid long single invocations.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

const VENDOR_PREFIXES = ['CXNK', 'ZNTS'];
const XGS_MODELS = ['GP1101X', 'GP4201X', 'GP4201XH', '5222XG', '5228XG'];
const GPON_MODELS = ['711GE', '717GE', '725G', '725GE', '725', '812G-1', '844G-1', '844GE-1', '803G'];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeOntId(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim().toUpperCase();
  if (!s) return null;
  return /^\d+$/.test(s) ? (s.replace(/^0+/, '') || '0') : s;
}

function normalizePort(value) {
  if (!value) return null;
  return String(value).trim().toUpperCase().replace(/\s+/g, '').replace(/\/XP(\d)/g, '/$1');
}

function normalizeSerial(value) {
  if (!value || typeof value !== 'string') return null;
  let normalized = value.trim().toUpperCase();
  for (const prefix of VENDOR_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length);
      break;
    }
  }
  normalized = normalized.replace(/[^A-Z0-9]/g, '');
  return normalized || null;
}

function detectTechnologyType(model) {
  if (!model) return 'unknown';
  const normalized = String(model).toUpperCase().trim().replace(/\s/g, '');
  if (!normalized) return 'unknown';
  if (normalized.includes('DZS')) return 'XGS-PON';
  for (const modelName of XGS_MODELS) if (normalized.includes(modelName)) return 'XGS-PON';
  for (const modelName of GPON_MODELS) if (normalized.includes(modelName)) return 'GPON';
  return 'unknown';
}

function buildFullAddress(record) {
  return [record.Address, record.City, record.State, record.Zip]
    .filter((part) => part && String(part).trim())
    .map((part) => String(part).trim())
    .join(', ');
}

function buildSubscriberLookups(records) {
  const byOntId = new Map();
  const byComposite = new Map();
  const byPortOntId = new Map();
  const bySerial = new Map();

  for (const record of records) {
    const ontId = normalizeOntId(record.OntID);
    if (!ontId) continue;

    const model = String(record.ONTModel || '').trim();
    const fields = {
      subscriber_account_name: record.AccountName || '',
      subscriber_address: buildFullAddress(record) || record.Address || '',
      subscriber_model: model,
      model,
      technology_type: detectTechnologyType(model),
    };

    if (!byOntId.has(ontId)) byOntId.set(ontId, fields);

    const olt = record.DeviceName ? String(record.DeviceName).trim().toUpperCase() : null;
    const port = normalizePort(record.LinkedPon);
    if (olt && port) byComposite.set(`${olt}|${port}|${ontId}`, fields);
    if (port) byPortOntId.set(`${port}|${ontId}`, fields);

    const serial = normalizeSerial(record.ONTSerialNo);
    if (serial && !bySerial.has(serial)) bySerial.set(serial, fields);
  }

  console.log(`[syncSubscriber] Lookup built: ${byOntId.size} ONT IDs, ${byComposite.size} composite, ${byPortOntId.size} port+ONT, ${bySerial.size} serial`);
  return { byOntId, byComposite, byPortOntId, bySerial };
}

function matchSubscriber(record, lookups) {
  const ontId = normalizeOntId(record.ont_id);
  const olt = record.olt_name ? String(record.olt_name).trim().toUpperCase() : null;
  const port = normalizePort(record.shelf_slot_port);

  if (olt && port && ontId) {
    const composite = lookups.byComposite.get(`${olt}|${port}|${ontId}`);
    if (composite) return composite;
  }

  if (port && ontId) {
    const portMatch = lookups.byPortOntId.get(`${port}|${ontId}`);
    if (portMatch) return portMatch;
  }

  if (ontId) {
    const ontIdMatch = lookups.byOntId.get(ontId);
    if (ontIdMatch) return ontIdMatch;
  }

  const serial = normalizeSerial(record.serial_number);
  return serial ? lookups.bySerial.get(serial) || null : null;
}

async function loadActiveSubscribers(base44) {
  const metas = await base44.asServiceRole.entities.SubscriberUploadMeta.filter({ status: 'active' }, '-created_date', 1);
  const activeMeta = metas?.[0] || null;
  if (!activeMeta?.id) return { activeMeta: null, records: [] };

  const records = [];
  const pageSize = 5000;
  let offset = 0;
  while (true) {
    const page = await base44.asServiceRole.entities.SubscriberRecord.filter(
      { upload_id: activeMeta.id },
      'id',
      pageSize,
      offset
    );
    if (!page || page.length === 0) break;
    records.push(...page);
    if (page.length < pageSize) break;
    offset += page.length;
    await sleep(150);
  }

  return { activeMeta, records };
}

async function updateRecordWithRetry(base44, id, fields) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await base44.asServiceRole.entities.ONTPerformanceRecord.update(id, fields);
      return;
    } catch (error) {
      const isRateLimit = error?.status === 429 || /rate limit/i.test(error?.message || '');
      if (!isRateLimit || attempt === 4) throw error;
      await sleep(500 * attempt);
    }
  }
}

async function recalculateReportSummaries(base44) {
  const countsByReport = new Map();
  const pageSize = 5000;
  let offset = 0;

  while (true) {
    const records = await base44.asServiceRole.entities.ONTPerformanceRecord.list('id', pageSize, offset);
    if (!records || records.length === 0) break;

    for (const record of records) {
      if (!record.report_id) continue;
      if (!countsByReport.has(record.report_id)) {
        countsByReport.set(record.report_id, {
          total: 0,
          critical: 0,
          warning: 0,
          ok: 0,
          gpon: 0,
          xgs: 0,
        });
      }

      const counts = countsByReport.get(record.report_id);
      counts.total++;
      if (record.status === 'critical') counts.critical++;
      else if (record.status === 'warning') counts.warning++;
      else if (record.status !== 'offline') counts.ok++;

      const tech = record.technology_type && record.technology_type !== 'unknown'
        ? record.technology_type
        : detectTechnologyType(record.subscriber_model || record.model);
      if (tech === 'GPON') counts.gpon++;
      else if (tech === 'XGS-PON') counts.xgs++;
    }

    if (records.length < pageSize) break;
    offset += records.length;
    await sleep(150);
  }

  let updatedReports = 0;
  for (const [reportId, counts] of countsByReport.entries()) {
    await base44.asServiceRole.entities.PONPMReport.update(reportId, {
      ont_count: counts.total,
      critical_count: counts.critical,
      warning_count: counts.warning,
      ok_count: counts.ok,
      gpon_count: counts.gpon,
      xgs_count: counts.xgs,
    });
    updatedReports++;
    await sleep(80);
  }

  return updatedReports;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const isAutomation = !!body.event;

    if (!isAutomation) {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const startTime = Date.now();
    const startOffset = Number.isFinite(body.start_offset) ? body.start_offset : 0;
    const maxBatches = Number.isFinite(body.max_batches) ? body.max_batches : Infinity;
    const timeBudgetMs = Number.isFinite(body.time_budget_ms) ? body.time_budget_ms : 24000;
    const autoContinue = body.auto_continue !== false;

    console.log(`[syncSubscriber] Starting at ONT offset ${startOffset}`);

    const { activeMeta, records: subscriberRecords } = await loadActiveSubscribers(base44);
    if (!activeMeta) {
      return Response.json({ success: true, message: 'No active subscriber upload found', updated: 0, complete: true });
    }
    if (subscriberRecords.length === 0) {
      return Response.json({ success: true, message: 'Active subscriber upload has no records', updated: 0, complete: true });
    }

    console.log(`[syncSubscriber] Loaded ${subscriberRecords.length} active subscriber records from upload ${activeMeta.id}`);
    const lookups = buildSubscriberLookups(subscriberRecords);

    const requestedPageSize = Number.isFinite(body.ont_page_size) ? body.ont_page_size : 150;
    const pageSize = Math.max(25, Math.min(200, requestedPageSize));
    let offset = startOffset;
    let updated = 0;
    let skipped = 0;
    let noMatch = 0;
    let batchesProcessed = 0;
    let exhausted = false;

    while (true) {
      if (batchesProcessed >= maxBatches) break;
      if (Date.now() - startTime > timeBudgetMs) break;

      const batch = await base44.asServiceRole.entities.ONTPerformanceRecord.list('id', pageSize, offset);
      if (!batch || batch.length === 0) {
        exhausted = true;
        break;
      }

      for (const record of batch) {
        const match = matchSubscriber(record, lookups);
        if (!match) {
          noMatch++;
          continue;
        }

        const nextModel = match.model || record.model || '';
        const nextTech = match.technology_type !== 'unknown'
          ? match.technology_type
          : detectTechnologyType(nextModel);

        const fields = {
          subscriber_account_name: match.subscriber_account_name,
          subscriber_address: match.subscriber_address,
          subscriber_model: match.subscriber_model,
          ...(match.model && { model: match.model }),
          technology_type: nextTech,
        };

        const changed =
          (record.subscriber_account_name || '') !== (fields.subscriber_account_name || '') ||
          (record.subscriber_address || '') !== (fields.subscriber_address || '') ||
          (record.subscriber_model || '') !== (fields.subscriber_model || '') ||
          (match.model && (record.model || '') !== match.model) ||
          (record.technology_type || 'unknown') !== nextTech;

        if (!changed) {
          skipped++;
          continue;
        }

        await updateRecordWithRetry(base44, record.id, fields);
        updated++;
        await sleep(120);
      }

      offset += batch.length;
      batchesProcessed++;
      console.log(`[syncSubscriber] Processed to offset ${offset}; updated=${updated}, skipped=${skipped}, noMatch=${noMatch}`);

      if (batch.length < pageSize) {
        exhausted = true;
        break;
      }
    }

    const nextOffset = exhausted ? null : offset;
    let updatedReports = 0;
    if (exhausted) {
      updatedReports = await recalculateReportSummaries(base44);
      console.log(`[syncSubscriber] Complete. Recalculated ${updatedReports} report summaries.`);
    } else if (autoContinue) {
      base44.functions.invoke('syncSubscriberToOntRecords', {
        start_offset: nextOffset,
        time_budget_ms: timeBudgetMs,
        ont_page_size: pageSize,
        auto_continue: true,
      }).catch((error) => {
        console.error('[syncSubscriber] Auto-continue failed:', error.message);
      });
    }

    return Response.json({
      success: true,
      active_upload_id: activeMeta.id,
      updated,
      skipped_unchanged: skipped,
      no_match: noMatch,
      start_offset: startOffset,
      next_offset: nextOffset,
      complete: exhausted,
      auto_continue_started: !exhausted && autoContinue,
      updated_report_summaries: updatedReports,
      elapsed_seconds: Number(((Date.now() - startTime) / 1000).toFixed(1)),
    });
  } catch (error) {
    console.error('[syncSubscriber] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});