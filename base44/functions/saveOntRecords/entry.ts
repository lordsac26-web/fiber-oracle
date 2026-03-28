import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_id, report_date, onts } = await req.json();

    if (!report_id || !onts || !Array.isArray(onts)) {
      return Response.json({ error: 'Missing report_id or onts array' }, { status: 400 });
    }

    // Process all ONTs - no limit, handle large datasets
    const chunkSize = 500; // Larger chunks for efficiency
    let savedCount = 0;

    for (let i = 0; i < onts.length; i += chunkSize) {
      const chunk = onts.slice(i, i + chunkSize);

      const records = chunk.map(ont => ({
        report_id: report_id,
        report_date: report_date,
        serial_number: ont.SerialNumber || '',
        ont_id: ont.OntID?.toString() || '',
        olt_name: ont._oltName || '',
        shelf_slot_port: ont['Shelf/Slot/Port'] || ont._port || '',
        model: ont.model || '',
        ont_rx_power: parseFloat(ont.OntRxOptPwr) || null,
        olt_rx_power: parseFloat(ont.OLTRXOptPwr) || null,
        ont_tx_power: parseFloat(ont.OntTxPwr) || null,
        us_bip_errors: parseInt(ont.UpstreamBipErrors) || 0,
        ds_bip_errors: parseInt(ont.DownstreamBipErrors) || 0,
        us_fec_uncorrected: parseInt(ont.UpstreamFecUncorrectedCodeWords) || 0,
        ds_fec_uncorrected: parseInt(ont.DownstreamFecUncorrectedCodeWords) || 0,
        status: ont._analysis?.status || 'ok',
        lcp_number: ont._lcpNumber || '',
        splitter_number: ont._splitterNumber || '',
      }));

      await base44.asServiceRole.entities.ONTPerformanceRecord.bulkCreate(records);
      savedCount += chunk.length;
    }

    return Response.json({ 
      success: true, 
      savedCount,
      message: `Saved ${savedCount} ONT records`
    });

  } catch (error) {
    console.error('Save ONT records error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});