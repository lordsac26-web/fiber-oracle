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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeArray(raw) {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return Array.isArray(raw) ? raw : [];
}

async function safeList(entity, sort, limit, offset) {
  let attempts = 0;
  while (attempts < 6) {
    try {
      return normalizeArray(await entity.list(sort, limit, offset));
    } catch (e) {
      const msg = e.message || String(e);
      if (!msg.includes('Rate limit')) throw e;
      attempts++;
      const wait = attempts * 2000;
      console.warn('[autoChunk] Rate limited on list, waiting ' + (wait / 1000) + 's...');
      await sleep(wait);
    }
  }
  throw new Error('Rate limit exceeded while listing records');
}

async function safeFilter(entity, query, sort, limit, offset) {
  let attempts = 0;
  while (attempts < 6) {
    try {
      return normalizeArray(await entity.filter(query, sort, limit, offset));
    } catch (e) {
      const msg = e.message || String(e);
      if (!msg.includes('Rate limit')) throw e;
      attempts++;
      const wait = attempts * 2000;
      console.warn('[autoChunk] Rate limited on filter, waiting ' + (wait / 1000) + 's...');
      await sleep(wait);
    }
  }
  throw new Error('Rate limit exceeded while filtering records');
}

Deno.serve(async (req) => {
  console.log('[autoChunk] Starting');

  let base44;
  try {
    base44 = createClientFromRequest(req);
  } catch (initErr) {
    console.error('[autoChunk] SDK init failed:', initErr.message);
    return Response.json({ error: 'SDK init failed: ' + initErr.message }, { status: 500 });
  }

  try {
    // Verify the caller is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    // Step 1: Scan ReferenceDocuments one at a time and check chunk existence per doc.
    // This avoids loading the full DocumentChunk table on every scheduled run.
    console.log('[autoChunk] Step 1: Scanning for unchunked document...');
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
        const msg = e.message || String(e);
        if (msg.includes('decompress')) {
          console.warn('[autoChunk] Skipping offset ' + offset + ' (decompression error)');
          offset++;
          continue;
        }
        console.warn('[autoChunk] Error at offset ' + offset + ':', msg);
        offset++;
        continue;
      }

      const hasContent = doc.content && doc.content.length > 20;
      const isActive = doc.is_active !== false;
      const metadataChunked = !!(doc.metadata && doc.metadata.chunked_at);

      if (!isActive || !hasContent || metadataChunked) {
        offset++;
        continue;
      }

      try {
        const existingChunks = await safeFilter(
          base44.asServiceRole.entities.DocumentChunk,
          { document_id: doc.id },
          '-created_date',
          1,
          0
        );

        if (existingChunks.length === 0) {
          targetDoc = doc;
        } else {
          offset++;
        }
      } catch (e) {
        console.warn('[autoChunk] Chunk existence check failed for doc ' + doc.id + ':', e.message || String(e));
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
          const msg = e.message || String(e);
          if (msg.includes('Rate limit') && retries < 5) {
            retries++;
            const wait = retries * 3000;
            console.warn('[autoChunk] Rate limited on batch ' + i + ', waiting ' + (wait/1000) + 's (retry ' + retries + '/5)');
            await new Promise(r => setTimeout(r, wait));
          } else {
            console.error('[autoChunk] Failed batch at ' + i + ':', msg);
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
    console.error('[autoChunk] Unhandled error:', error.message || String(error));
    console.error('[autoChunk] Stack:', error.stack || 'no stack');
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});