/**
 * Shared helpers for the ONT Alerts feature.
 *
 * Alerts denormalize a snapshot of the ONT at flag time (serial, subscriber,
 * location, status, issue summary) so the Alerts section is self-contained and
 * does not depend on the originating report still being loaded in memory.
 */

// Build a one-line, human-readable summary of the issues/warnings on an ONT.
export function buildIssueSummary(ont) {
  const issues = ont?._analysis?.issues || [];
  const warnings = ont?._analysis?.warnings || [];
  const parts = [
    ...issues.map((i) => i.field),
    ...warnings.map((w) => w.field),
  ];
  if (parts.length === 0) {
    return ont?._analysis?.status ? `Status: ${ont._analysis.status}` : 'Flagged';
  }
  const shown = parts.slice(0, 4).join(', ');
  const extra = parts.length > 4 ? ` +${parts.length - 4} more` : '';
  return `${shown}${extra}`;
}

// Full subscriber address used to prefill a work-order location.
export function buildSubscriberAddress(ont) {
  const s = ont?._subscriber;
  if (!s) return '';
  return [s.streetAddress || s.address, s.city, s.state, s.zip]
    .filter(Boolean)
    .join(', ');
}

// Convert an in-memory ONT (from result.onts) into an ONTAlert create payload.
export function ontToAlertPayload(ont, { reportId, priority = 'medium', note = '' } = {}) {
  const toNum = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    serial_number: ont.SerialNumber || '',
    ont_id: ont.OntID ? String(ont.OntID) : undefined,
    olt_name: ont._oltName || ont.OLTName || undefined,
    port: ont._port || ont['Shelf/Slot/Port'] || undefined,
    lcp_number: ont._lcpNumber || undefined,
    splitter_number: ont._splitterNumber || undefined,
    ont_rx_power: toNum(ont.OntRxOptPwr),
    olt_rx_power: toNum(ont.OLTRXOptPwr),
    ont_status: ont._analysis?.status || undefined,
    issue_summary: buildIssueSummary(ont),
    subscriber_name: ont._subscriber?.name || undefined,
    subscriber_account: ont._subscriber?.account || undefined,
    subscriber_address: buildSubscriberAddress(ont) || undefined,
    report_id: reportId || undefined,
    priority,
    note: note || undefined,
    status: 'open',
  };
}

export const PRIORITY_STYLES = {
  high: 'bg-red-100 text-red-800 border-red-300',
  medium: 'bg-amber-100 text-amber-800 border-amber-300',
  low: 'bg-blue-100 text-blue-800 border-blue-300',
};

export const ONT_STATUS_STYLES = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  offline: 'bg-purple-100 text-purple-800 border-purple-300',
  ok: 'bg-green-100 text-green-800 border-green-300',
};