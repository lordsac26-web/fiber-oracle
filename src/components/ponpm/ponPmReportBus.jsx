import { base44 } from '@/api/base44Client';

/**
 * Shared PONPMReport real-time subscription hub.
 *
 * Previously three independent consumers (the inline progress effect in
 * PONPMAnalysis, useProcessingReports, and useNewReportToast) each opened their
 * own base44.entities.PONPMReport.subscribe() socket. That meant 3 live sockets
 * per mounted page and 3 duplicate event deliveries per entity change — wasteful
 * across 8 concurrent users.
 *
 * This module multiplexes a SINGLE underlying socket and fans every event out to
 * all registered listeners. The real socket is opened lazily on the first
 * subscriber and torn down (refcounted) when the last one unsubscribes.
 */

const listeners = new Set();
let unsubscribeReal = null;

function openRealSocket() {
  if (unsubscribeReal) return;
  unsubscribeReal = base44.entities.PONPMReport.subscribe((event) => {
    // Snapshot listeners before dispatch so a listener unsubscribing during
    // iteration can't mutate the set we're looping over.
    for (const cb of Array.from(listeners)) {
      try {
        cb(event);
      } catch (err) {
        // A misbehaving listener must not break delivery to the others.
        console.error('PONPMReport subscription listener threw:', err);
      }
    }
  });
}

function closeRealSocket() {
  if (unsubscribeReal) {
    unsubscribeReal();
    unsubscribeReal = null;
  }
}

/**
 * Register a listener for PONPMReport entity events.
 * @param {(event: { type: string, id: string, data?: object }) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function subscribePonPmReport(callback) {
  listeners.add(callback);
  openRealSocket();

  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) closeRealSocket();
  };
}