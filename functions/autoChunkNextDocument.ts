import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const CHUNK_SIZE = 2000;
const OVERLAP = 200;

function extractKeywords(text) {
  const stops = new Set([
    'the','be','to','of','and','a','in','that','have','i','it','for','not','on',
    'with','he','as','you','do','at','this','but','his','by','from','they','we',
    'say','her','she','or','an','will','my','one','all','would','there','their',
    'what','so','up','out','if','about','who','get','which','go','me','when',
    'make','can','like','time','no','just','him','know','take','people','into',
    'year','your','good','some','could','them','see','other','than','then','now',
    'look','only','come','its','over','think','also','back','after','use','two',
    'how','our','work','first','well','way','even','new','want','because','any',
    'these','give','day','most','us','are','was','were','been','has','had','is',
    'may','should','shall','must','each','such','very','more','per','etc','via'
  ]);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !stops.has(w));
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([w]) => w).join(' ');
}

function chunkText(content) {
  const chunks = [];
  let start = 0;
  let idx = 0;
  while (start < content.length) {
    const end = Math.min(start + CHUNK_SIZE, content.length);
    let actual = end;
    if (end < content.length) {
      const para = content.lastIndexOf('\n\n', end);
      if (para > start + CHUNK_SIZE * 0.5) {
        actual = para + 2;
      } else {
        const sent = content.lastIndexOf('. ', end);
        if (sent > start + CHUNK_SIZE * 0.5) actual = sent + 2;
      }
    }
    const text = content.substring(start, actual).trim();
    if (text.length > 10) {
      chunks.push({ index: idx, text });
      idx++;
    }
    start = actual - OVERLAP;
    if (start >= content.length - OVERLAP) break;
  }
  return chunks;
}

Deno.serve(async (req) => {
  console.log('[autoChunk] Function invoked');
  let base44;
  try {
    base44 = createClientFromRequest(req);
    console.log('[autoChunk] SDK initialized');
  } catch (initErr) {
    console.error('[autoChunk] SDK init failed:', initErr.message);
    return Response.json({ error: 'SDK init: ' + initErr.message }, { status: 500 });
  }

  try {
    // Scan for next unchunked document using service role
    let targetDoc = null;
    let offset = 0;
    let scanned = 0;

    while (!targetDoc && offset < 500) {
      let docs = [];
      try {
        const raw = await base44.asServiceRole.entities.ReferenceDocument.list('created_date', 50, offset);
        if (typeof raw === 'string') {
          try { docs = JSON.parse(raw); } catch { docs = []; }
        } else if (Array.isArray(raw)) {
          docs = raw;
        }
      } catch (e) {
        if (e.message && e.message.includes('Rate limit')) {
          console.warn('[autoChunk] Rate limited during scan, waiting 3s...');
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        console.warn('[autoChunk] Scan error at offset ' + offset + ':', e.message);
        offset += 50;
        continue;
      }

      if (docs.length === 0) break;
      scanned += docs.length;

      for (const doc of docs) {
        const needsChunking = doc.is_active !== false
          && doc.content
          && doc.content.length > 20
          && !(doc.metadata && doc.metadata.chunked_at);
        if (needsChunking) {
          targetDoc = doc;
          break;
        }
      }

      if (!targetDoc) offset += docs.length;
    }

    if (!targetDoc) {
      console.log('[autoChunk] All documents chunked. Scanned: ' + scanned);
      return Response.json({ status: 'complete', message: 'All documents are chunked.', scanned });
    }

    console.log('[autoChunk] Processing: "' + targetDoc.title + '" (' + targetDoc.content.length + ' chars)');

    // Create chunks
    const rawChunks = chunkText(targetDoc.content);
    const chunkRecords = rawChunks.map(c => ({
      document_id: targetDoc.id,
      document_title: targetDoc.title,
      document_category: targetDoc.category || 'uncategorized',
      chunk_index: c.index,
      content: c.text,
      keywords: extractKeywords(c.text),
      token_count: Math.ceil(c.text.length / 4),
      metadata: {
        source_type: targetDoc.source_type,
        source_url: targetDoc.source_url,
        tags: targetDoc.tags || []
      }
    }));

    console.log('[autoChunk] Created ' + chunkRecords.length + ' chunks');

    // Delete existing chunks for this document
    try {
      const existing = await base44.asServiceRole.entities.DocumentChunk.filter({ document_id: targetDoc.id });
      const oldChunks = Array.isArray(existing) ? existing : [];
      if (oldChunks.length > 0) {
        console.log('[autoChunk] Removing ' + oldChunks.length + ' old chunks');
        for (const old of oldChunks) {
          try {
            await base44.asServiceRole.entities.DocumentChunk.delete(old.id);
          } catch (de) {
            if (de.message && de.message.includes('Rate limit')) {
              await new Promise(r => setTimeout(r, 2000));
              await base44.asServiceRole.entities.DocumentChunk.delete(old.id);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[autoChunk] Old chunk cleanup error:', e.message);
    }

    // Store new chunks in batches of 10
    let stored = 0;
    for (let i = 0; i < chunkRecords.length; i += 10) {
      const batch = chunkRecords.slice(i, i + 10);
      let retries = 0;
      while (retries < 6) {
        try {
          await base44.asServiceRole.entities.DocumentChunk.bulkCreate(batch);
          stored += batch.length;
          await new Promise(r => setTimeout(r, 800));
          break;
        } catch (e) {
          if (e.message && e.message.includes('Rate limit') && retries < 5) {
            retries++;
            const wait = retries * 3000;
            console.warn('[autoChunk] Rate limited storing batch, waiting ' + (wait/1000) + 's (retry ' + retries + '/5)');
            await new Promise(r => setTimeout(r, wait));
          } else {
            console.error('[autoChunk] Failed batch at ' + i + ':', e.message);
            throw e;
          }
        }
      }
    }

    // Mark document as chunked
    const updatedMeta = Object.assign({}, targetDoc.metadata || {}, {
      chunk_count: chunkRecords.length,
      chunked_at: new Date().toISOString(),
      total_chars: targetDoc.content.length
    });
    await base44.asServiceRole.entities.ReferenceDocument.update(targetDoc.id, { metadata: updatedMeta });

    console.log('[autoChunk] Done: "' + targetDoc.title + '" -> ' + stored + ' chunks stored');

    return Response.json({
      status: 'chunked',
      document_id: targetDoc.id,
      title: targetDoc.title,
      chunks_created: chunkRecords.length,
      chunks_stored: stored,
      content_length: targetDoc.content.length
    });

  } catch (error) {
    console.error('[autoChunk] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});