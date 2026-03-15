import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Normalize serial number (FSAN) for consistent matching - same logic as parsePonPm
function normalizeSerialNumber(serial) {
  if (!serial || typeof serial !== 'string') return null;
  
  // Convert to uppercase, trim whitespace, remove common OCR artifacts
  let normalized = serial.trim().toUpperCase();
  
  // Remove any non-alphanumeric characters that might be OCR errors
  // Keep only letters and numbers (typical FSAN format: 8 alphanumeric chars)
  normalized = normalized.replace(/[^A-Z0-9]/g, '');
  
  // If empty after cleaning, return null
  return normalized.length > 0 ? normalized : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { search_type, search_value, date_from, date_to } = await req.json();

    if (!search_type || !search_value) {
      return Response.json({ error: 'Missing search_type or search_value' }, { status: 400 });
    }

    // Build query based on search type
    let query = {};
    
    if (search_type === 'fsan' || search_type === 'serial') {
      // Normalize the search value for consistent matching
      query.serial_number = normalizeSerialNumber(search_value);
    } else if (search_type === 'olt') {
      query.olt_name = search_value;
    } else if (search_type === 'port') {
      // Search by shelf/slot/port pattern
      query.shelf_slot_port = search_value;
    } else if (search_type === 'olt_port') {
      // Combined OLT and port search
      const [olt, port] = search_value.split('|');
      query.olt_name = olt;
      if (port) {
        query.shelf_slot_port = port;
      }
    }

    // Fetch matching records
    const records = await base44.entities.ONTPerformanceRecord.filter(query, '-report_date', 500);

    // Filter by date range if provided
    let filteredRecords = records;
    if (date_from || date_to) {
      filteredRecords = records.filter(r => {
        const recordDate = new Date(r.report_date);
        if (date_from && recordDate < new Date(date_from)) return false;
        if (date_to && recordDate > new Date(date_to)) return false;
        return true;
      });
    }

    // Group records by serial number for trend analysis
    const bySerial = {};
    filteredRecords.forEach(record => {
      const key = record.serial_number;
      if (!bySerial[key]) {
        bySerial[key] = {
          serial_number: record.serial_number,
          ont_id: record.ont_id,
          olt_name: record.olt_name,
          shelf_slot_port: record.shelf_slot_port,
          model: record.model,
          lcp_number: record.lcp_number,
          // Map database fields to frontend format for consistency
          _lcpNumber: record.lcp_number,
          _oltName: record.olt_name,
          _port: record.shelf_slot_port,
          history: []
        };
      }
      bySerial[key].history.push({
        date: record.report_date,
        report_id: record.report_id,
        ont_rx_power: record.ont_rx_power,
        olt_rx_power: record.olt_rx_power,
        ont_tx_power: record.ont_tx_power,
        us_bip_errors: record.us_bip_errors,
        ds_bip_errors: record.ds_bip_errors,
        us_fec_uncorrected: record.us_fec_uncorrected,
        ds_fec_uncorrected: record.ds_fec_uncorrected,
        us_fec_corrected: record.us_fec_corrected,
        ds_fec_corrected: record.ds_fec_corrected,
        us_gem_hec_errors: record.us_gem_hec_errors,
        us_missed_bursts: record.us_missed_bursts,
        status: record.status,
        lcp_number: record.lcp_number
      });
    });

    // Sort history by date for each ONT
    Object.values(bySerial).forEach(ont => {
      ont.history.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Calculate trend if we have multiple data points
      if (ont.history.length >= 2) {
        const first = ont.history[0];
        const last = ont.history[ont.history.length - 1];
        ont.trend = {
          rx_change: last.ont_rx_power && first.ont_rx_power 
            ? last.ont_rx_power - first.ont_rx_power 
            : null,
          days_span: Math.round((new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24)),
          data_points: ont.history.length
        };
      }
    });

    return Response.json({ 
      success: true, 
      results: Object.values(bySerial),
      total_records: filteredRecords.length,
      unique_onts: Object.keys(bySerial).length
    });

  } catch (error) {
    console.error('Search ONT history error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});