import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();
    
    if (!file_url) {
      return Response.json({ error: 'No file URL provided' }, { status: 400 });
    }

    // Use AI to extract structured data from the iOLM report
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert OTDR/iOLM report parser. Extract all relevant data from this EXFO iOLM report.

IMPORTANT: Parse the document carefully and extract:
1. Test setup information (OTDR brand should be "exfo", fiber type, wavelength, pulse width)
2. Link summary (total fiber length in km, total link loss in dB)
3. All events/anomalies with their details

For fiber type, map to one of these values:
- smf_g652 (Standard SMF, G.652.D)
- smf_g657a1 (Bend-insensitive A1)
- smf_g657a2 (Bend-insensitive A2)
- smf_g657b3 (Ultra-bend B3)
- mmf_om3 (Multimode OM3)
- mmf_om4 (Multimode OM4)

For wavelength, use just the number: 1310, 1550, 1625, 1490, 1577, or 850

For event types, use: connector, splice, bend, end, anomaly, or unknown

Extract ALL events shown in the report, including:
- Distance from origin (in meters)
- Loss at that event (in dB, positive number)
- Reflectance (in dB, typically negative like -45)
- Event type based on the report's classification

If certain data is not found, use reasonable defaults or leave empty.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          test_setup: {
            type: "object",
            properties: {
              otdr_brand: { type: "string", default: "exfo" },
              otdr_model: { type: "string" },
              fiber_type: { type: "string" },
              wavelength: { type: "string" },
              pulse_width: { type: "string" },
              test_date: { type: "string" },
              cable_id: { type: "string" },
              operator: { type: "string" }
            }
          },
          link_summary: {
            type: "object",
            properties: {
              total_length_km: { type: "number" },
              total_loss_db: { type: "number" },
              average_loss_db_km: { type: "number" },
              orl_db: { type: "number" },
              span_count: { type: "number" },
              connector_count: { type: "number" },
              splice_count: { type: "number" }
            }
          },
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                event_number: { type: "number" },
                distance_m: { type: "number" },
                loss_db: { type: "number" },
                reflectance_db: { type: "number" },
                event_type: { type: "string" },
                cumulative_loss_db: { type: "number" },
                pass_fail: { type: "string" },
                notes: { type: "string" }
              }
            }
          },
          pass_fail_status: { type: "string" },
          raw_notes: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('iOLM parsing error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});