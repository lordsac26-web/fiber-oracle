/**
 * getEnrichmentDatasets
 * ---------------------
 * Read-only. Returns the currently-active subscriber and eero datasets
 * (metadata + all records) for client-side ONT enrichment.
 *
 * Why a backend function instead of user-scoped SDK reads:
 *   The subscriber/eero *metadata* records are created by an admin during
 *   upload. A user-scoped read of those meta rows is subject to entity RLS,
 *   and the records-loading hooks gate on the meta existing — so any RLS
 *   propagation lag blocks non-admin viewers from seeing enrichment data.
 *   Reading here with the service role bypasses RLS, and auth-gating the
 *   function to "any authenticated user" keeps writes admin-only (those go
 *   through saveSubscriberData / saveEeroData, which remain admin-gated).
 *
 * Returns: { subscriberMeta, subscriberRecords, eeroMeta, eeroRecords }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Subscriber dataset ───────────────────────────────────────────────
    const subMetas = await base44.asServiceRole.entities.SubscriberUploadMeta
      .filter({ status: 'active' }, '-created_date', 1);
    const subscriberMeta = subMetas?.[0] || null;

    let subscriberRecords = [];
    if (subscriberMeta?.id) {
      const all = [];
      const PAGE = 5000; // platform list/filter cap
      for (let i = 0; ; i++) {
        const page = await base44.asServiceRole.entities.SubscriberRecord
          .filter({ upload_id: subscriberMeta.id }, 'id', PAGE, i * PAGE);
        if (!page || page.length === 0) break;
        all.push(...page);
        if (page.length < PAGE) break;
      }
      subscriberRecords = all;
    }

    // ── Eero dataset ─────────────────────────────────────────────────────
    const eeroMetas = await base44.asServiceRole.entities.EeroUploadMeta
      .filter({ status: 'active' }, '-created_date', 1);
    const eeroMeta = eeroMetas?.[0] || null;

    let eeroRecords = [];
    if (eeroMeta?.id) {
      const all = [];
      const PAGE = 5000;
      for (let i = 0; ; i++) {
        const page = await base44.asServiceRole.entities.EeroRecord
          .filter({ upload_id: eeroMeta.id }, 'id', PAGE, i * PAGE);
        if (!page || page.length === 0) break;
        all.push(...page);
        if (page.length < PAGE) break;
      }
      eeroRecords = all;
    }

    return Response.json({
      subscriberMeta,
      subscriberRecords,
      eeroMeta,
      eeroRecords,
    });
  } catch (error) {
    console.error('[getEnrichmentDatasets] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});