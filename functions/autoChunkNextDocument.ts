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

async function safeList(entity, sort, limit, offset) {
  const raw = await entity.list(sort, limit, offset);
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return Array.isArray(raw) ? raw : [];
}

Deno.serve(async (req) => {
  console.log('[autoChunk] Starting');
  const base44 = createClientFromRequest(req);

  try {
    // Strategy: Get set of already-chunked doc IDs from DocumentChunk (lightweight),
    // then scan ReferenceDocuments 1-at-a-time to find one NOT in that set.
    // This avoids loading 50 massive docs at once which causes Brotli decompression failures.

    // Step 1: Collect all unique document_ids that already have chunks
    const chunkedIds = new Set();
    let chunkOffset = 0;
    while (chunkOffset < 10000) {
      let chunkBatch;
      try {
        chunkBatch = await safeList(base44.asServiceRole.entities.DocumentChunk, 'created_date', 100, chunkOffset);
      } catch (e) {
        if (e.message && e.message.includes('Rate limit')) {
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        break;
      }
      if (chunkBatch.length === 0) break;
      for (const c of chunkBatch) {
        if (c.document_id) chunkedIds.add(c.document_id);
      }
      chunkOffset += chunkBatch.length;
    }
    console.log('[autoChunk] Already chunked doc IDs: ' + chunkedIds.size);

    // Step 2: Scan ReferenceDocuments ONE at a time to find an unchunked one.
    // Loading 1 at a time avoids the Brotli crash from huge payloads.
    let targetDoc = null;
    let offset = 0;
    let scanned = 0;

    while (!targetDoc && offset < 300) {
      let doc;
      try {
        const batch = await safeList(base44.asServiceRole.entities.ReferenceDocument, 'created_date', 1, offset);
        if (batch.length === 0) break;
        doc = batch[0];
        scanned++;
      } catch (e) {
        if (e.message && e.message.includes('Rate limit')) {
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        if (e.message && e.message.includes('decompress')) {
          // This specific document is too large to fetch — skip it
          console.warn('[autoChunk] Skipping offset ' + offset + ' (decompression error)');
          offset++;
          continue;
        }
        console.warn('[autoChunk] Error at offset ' + offset + ':', e.message);
        offset++;
        continue;
      }

      // Check: active, has content, not already chunked
      const alreadyChunked = chunkedIds.has(doc.id) || (doc.metadata && doc.metadata.chunked_at);
      const hasContent = doc.content && doc.content.length > 20;
      const isActive = doc.is_active !== false;

      if (isActive && hasContent && !alreadyChunked) {
        targetDoc = doc;
      } else {
        offset++;
      }
    }

    if (!targetDoc) {
      console.log('[autoChunk] All documents chunked. Scanned: ' + scanned);
      return Response.json({ status: 'complete', message: 'All documents are chunked.', scanned });
    }

    console.log('[autoChunk] Processing: "' + targetDoc.title + '" (' + targetDoc.content.length + ' chars)');

    // Step 3: Create chunks from content
    const rawChunks = chunkText(targetDoc.content);
    const chunkRecords = rawChunks.map(function(c) {
      return {
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
      };
    });

    console.log('[autoChunk] Created ' + chunkRecords.length + ' chunks');

    // Step 4: Store chunks in batches of 10 with rate limit handling
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
            console.warn('[autoChunk] Rate limited, waiting ' + (wait/1000) + 's (retry ' + retries + '/5)');
            await new Promise(r => setTimeout(r, wait));
          } else {
            console.error('[autoChunk] Failed batch at ' + i + ':', e.message);
            throw e;
          }
        }
      }
    }

    // Step 5: Mark document as chunked
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
    console.error('[autoChunk] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});