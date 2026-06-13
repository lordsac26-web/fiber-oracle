/**
 * runComplianceAudit — Monthly "Knowledge Integrity Check".
 *
 * Purpose:
 *   Keeps the app's technology/standards registry in line with the hardware
 *   actually present in the field. Every month (1st, 02:00 ET via a scheduled
 *   automation) this scans the most recent ONT performance data, cross-references
 *   each distinct model against the data-driven `TechnologyStandards` registry,
 *   and flags anything that no longer maps cleanly (e.g. a newly deployed
 *   Calix 50G-PON triple-combo card the registry hasn't been taught yet).
 *
 * Output:
 *   - Returns a structured variance report (JSON).
 *   - Emails an admin summary (ADMIN_CONTACT_EMAIL) when run as the scheduled
 *     automation or whenever variances are found.
 *
 * Auth:
 *   - Scheduled automation invokes with no user → runs under service role.
 *   - Manual invocation requires an authenticated admin.
 *
 * Design notes:
 *   - The classifier here MUST stay behaviourally identical to the one in
 *     processPonPmRecords.js (both read the same registry). This is the single
 *     source of truth for "what tech is this model?" going forward.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

// Normalize a raw model string the same way across the whole app:
// uppercase + strip all whitespace. Matching is then substring-based.
function normalizeModel(model) {
  if (!model || typeof model !== 'string') return '';
  return model.toUpperCase().trim().replace(/\s/g, '');
}

// Load active standards, sorted into deterministic evaluation order:
//   1. lower match_priority first (broad catch-alls get a high number so
//      specific rules win),
//   2. then longer model_pattern first (more specific substring wins ties).
async function loadStandards(base44) {
  const rows = await base44.asServiceRole.entities.TechnologyStandards.filter(
    { is_active: true }, '-created_date', 1000
  );
  return (rows || [])
    .map((r) => ({
      pattern: normalizeModel(r.model_pattern),
      tech: r.technology_type,
      priority: typeof r.match_priority === 'number' ? r.match_priority : 100,
    }))
    .filter((r) => r.pattern)
    .sort((a, b) => (a.priority - b.priority) || (b.pattern.length - a.pattern.length));
}

// Classify one model against the ordered standards list.
function classify(modelNorm, standards) {
  if (!modelNorm) return 'unknown';
  for (const s of standards) {
    if (modelNorm.includes(s.pattern)) return s.tech;
  }
  return 'unknown';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const isAutomation = !!body.event || body.scheduled === true;
    const user = !isAutomation ? await base44.auth.me().catch(() => null) : null;

    if (!isAutomation) {
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const standards = await loadStandards(base44);

    // Find the most recent completed report to sample current field hardware.
    const recentReports = await base44.asServiceRole.entities.PONPMReport.filter(
      { processing_status: 'completed' }, '-upload_date', 1
    );
    const latestReport = recentReports?.[0] || null;

    // Aggregate distinct models from the latest report (paginated scan).
    const modelCounts = new Map();   // normalizedModel -> { raw, count }
    if (latestReport?.id) {
      const PAGE = 5000;
      let offset = 0;
      while (true) {
        const batch = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
          { report_id: latestReport.id }, 'id', PAGE, offset
        );
        if (!batch || batch.length === 0) break;
        for (const rec of batch) {
          const norm = normalizeModel(rec.model);
          if (!norm) continue;
          const existing = modelCounts.get(norm);
          if (existing) existing.count++;
          else modelCounts.set(norm, { raw: rec.model, count: 1 });
        }
        if (batch.length < PAGE) break;
        offset += batch.length;
      }
    }

    // Classify each distinct model; collect anything that resolves to 'unknown'.
    const knownModels = [];
    const unknownModels = [];
    for (const [norm, info] of modelCounts.entries()) {
      const tech = classify(norm, standards);
      const entry = { model: info.raw, normalized: norm, count: info.count, technology_type: tech };
      if (tech === 'unknown') unknownModels.push(entry);
      else knownModels.push(entry);
    }
    unknownModels.sort((a, b) => b.count - a.count);
    knownModels.sort((a, b) => b.count - a.count);

    // Registry coverage summary by technology.
    const techCoverage = {};
    for (const s of standards) {
      techCoverage[s.tech] = (techCoverage[s.tech] || 0) + 1;
    }
    const has50G = standards.some((s) => s.tech === '50G-PON');

    const report = {
      timestamp: new Date().toISOString(),
      trigger: isAutomation ? 'scheduled' : 'manual',
      latest_report: latestReport
        ? { id: latestReport.id, name: latestReport.report_name, date: latestReport.upload_date }
        : null,
      registry: {
        active_standards: standards.length,
        tech_coverage: techCoverage,
        has_50g_pon_mapping: has50G,
      },
      distinct_models_in_field: modelCounts.size,
      unknown_models: unknownModels,
      known_models: knownModels,
      variances_found: unknownModels.length,
      status: unknownModels.length > 0 ? 'action_required' : 'compliant',
    };

    // Email the admin when run on schedule, or whenever variances are found.
    const shouldEmail = isAutomation || unknownModels.length > 0;
    const adminEmail = Deno.env.get('ADMIN_CONTACT_EMAIL');
    if (shouldEmail && adminEmail) {
      const lines = [];
      lines.push('Fiber Oracle — Monthly Standards & Compliance Audit');
      lines.push('');
      lines.push(`Run: ${report.timestamp} (${report.trigger})`);
      lines.push(`Overall status: ${report.status.toUpperCase()}`);
      lines.push('');
      lines.push('Registry health:');
      lines.push(`  Active standard mappings: ${report.registry.active_standards}`);
      lines.push(`  Technology coverage: ${Object.entries(techCoverage).map(([t, n]) => `${t} (${n})`).join(', ') || 'none'}`);
      lines.push(`  50G-PON mapping present: ${has50G ? 'YES' : 'NO — consider adding for Calix E7 triple-combo cards'}`);
      lines.push('');
      if (latestReport) {
        lines.push(`Sampled report: ${latestReport.report_name} (${latestReport.upload_date})`);
        lines.push(`Distinct models in field: ${report.distinct_models_in_field}`);
      } else {
        lines.push('No completed report available to sample field hardware.');
      }
      lines.push('');
      if (unknownModels.length > 0) {
        lines.push(`⚠ ${unknownModels.length} UNRECOGNIZED MODEL(S) — registry update needed:`);
        for (const m of unknownModels.slice(0, 50)) {
          lines.push(`   • ${m.model}  (${m.count} ONTs)  → currently classified as "unknown"`);
        }
        lines.push('');
        lines.push('Action: add a TechnologyStandards row mapping each model to its PON type,');
        lines.push('then the next ingest will classify them automatically.');
      } else {
        lines.push('✓ All field models map cleanly to the standards registry. No action required.');
      }
      lines.push('');
      lines.push('---');
      lines.push('Automated monthly audit · Fiber Oracle');

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: adminEmail,
        subject: `[Fiber Oracle] Monthly Compliance Audit — ${report.status === 'compliant' ? 'All Clear' : `${unknownModels.length} variance(s)`}`,
        body: lines.join('\n'),
        from_name: 'Fiber Oracle Compliance',
      });
      report.email_sent = true;
    } else {
      report.email_sent = false;
    }

    return Response.json(report, { status: 200 });
  } catch (error) {
    console.error('[runComplianceAudit] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});