import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const CHUNK_SIZE_CHARS = 2000;
const CHUNK_OVERLAP_CHARS = 200;

function extractKeywords(text) {
  const stopWords = new Set([
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
  const words = text.toLowerCase().replace(/[^a-z0-9\s\-\.]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([w]) => w).join(' ');
}

function chunkContent(content, docId, doc) {
  const chunks = [];
  let startPos = 0;
  let chunkIndex = 0;

  while (startPos < content.length) {
    const endPos = Math.min(startPos + CHUNK_SIZE_CHARS, content.length);
    let actualEnd = endPos;
    if (endPos < content.length) {
      const paraBreak = content.lastIndexOf('\n\n', endPos);
      if (paraBreak > startPos + CHUNK_SIZE_CHARS * 0.5) {
        actualEnd = paraBreak + 2;
      } else {
        const sentBreak = content.lastIndexOf('. ', endPos);
        if (sentBreak > startPos + CHUNK_SIZE_CHARS * 0.5) actualEnd = sentBreak + 2;
      }
    }
    const chunkContent = content.substring(startPos, actualEnd).trim();
    if (chunkContent.length > 10) {
      chunks.push({
        document_id: docId,
        document_title: doc.title,
        document_category: doc.category || 'uncategorized',
        chunk_index: chunkIndex,
        content: chunkContent,
        keywords: extractKeywords(chunkContent),
        token_count: Math.ceil(chunkContent.length / 4),
        metadata: { source_type: doc.source_type, source_url: doc.source_url, tags: doc.tags || [] }
      });
      chunkIndex++;
    }
    startPos = actualEnd - CHUNK_OVERLAP_CHARS;
    if (startPos >= content.length - CHUNK_OVERLAP_CHARS) break;
  }
  return chunks;
}

async function processOneDocument(base44, docId, title) {
  // Fetch full document by ID — single-doc fetch works fine
  const doc = await base44.asServiceRole.entities.ReferenceDocument.get(docId);
  if (!doc || !doc.content || doc.content.length < 20) {
    return { success: false, error: 'No content' };
  }

  const chunks = chunkContent(doc.content, docId, doc);
  console.log(`[chunkAll]   "${title}": ${doc.content.length} chars -> ${chunks.length} chunks`);

  // Delete old chunks
  let existingChunks = [];
  try {
    const raw = await base44.asServiceRole.entities.DocumentChunk.filter({ document_id: docId });
    if (typeof raw === 'string') existingChunks = JSON.parse(raw);
    else if (Array.isArray(raw)) existingChunks = raw;
  } catch (e) { /* no existing chunks */ }

  for (const old of existingChunks) {
    await base44.asServiceRole.entities.DocumentChunk.delete(old.id);
  }

  // Store in batches
  for (let i = 0; i < chunks.length; i += 20) {
    await base44.asServiceRole.entities.DocumentChunk.bulkCreate(chunks.slice(i, i + 20));
  }

  // Update doc metadata
  await base44.asServiceRole.entities.ReferenceDocument.update(docId, {
    metadata: { ...doc.metadata, chunk_count: chunks.length, chunked_at: new Date().toISOString(), total_chars: doc.content.length }
  });

  return { success: true, chunks: chunks.length };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const forceRechunk = body.force || false;
    const batchSize = body.batch_size || 5;
    const skipCount = body.skip || 0;

    console.log(`[chunkAll] Starting. skip=${skipCount}, batch=${batchSize}, force=${forceRechunk}`);

    // Build document index one at a time to avoid OOM
    const docIndex = [];
    let offset = 0;
    let consecutiveErrors = 0;

    while (consecutiveErrors < 5) {
      try {
        const raw = await base44.asServiceRole.entities.ReferenceDocument.list('created_date', 1, offset);
        let docs;
        if (typeof raw === 'string') {
          docs = JSON.parse(raw);
        } else if (Array.isArray(raw)) {
          docs = raw;
        } else {
          docs = [];
        }
        if (docs.length === 0) break;

        const doc = docs[0];
        docIndex.push({
          id: doc.id,
          title: doc.title,
          is_active: doc.is_active !== false,
          has_content: !!(doc.content && doc.content.length > 20),
          already_chunked: !!doc.metadata?.chunked_at
        });
        offset++;
        consecutiveErrors = 0;
        if (docIndex.length > 300) break;
      } catch (e) {
        // Some docs are so large even 1-at-a-time fails to parse
        // Skip them and continue
        console.warn(`[chunkAll] Skip offset ${offset}: ${e.message.substring(0, 80)}`);
        consecutiveErrors++;
        offset++;
      }
    }

    console.log(`[chunkAll] Indexed ${docIndex.length} documents (scanned ${offset} offsets)`);

    // Filter
    const docsToProcess = docIndex.filter(d => {
      if (!d.has_content || !d.is_active) return false;
      if (!forceRechunk && d.already_chunked) return false;
      return true;
    });

    console.log(`[chunkAll] ${docsToProcess.length} need chunking`);

    const batch = docsToProcess.slice(skipCount, skipCount + batchSize);
    const results = { success: [], failed: [] };

    for (const doc of batch) {
      try {
        const res = await processOneDocument(base44, doc.id, doc.title);
        if (res.success) {
          results.success.push({ id: doc.id, title: doc.title, chunks: res.chunks });
        } else {
          results.failed.push({ id: doc.id, title: doc.title, error: res.error });
        }
      } catch (err) {
        console.error(`[chunkAll] Failed "${doc.title}":`, err.message);
        results.failed.push({ id: doc.id, title: doc.title, error: err.message });
      }
    }

    const remaining = Math.max(0, docsToProcess.length - skipCount - batch.length);

    return Response.json({
      total_documents: docIndex.length,
      need_chunking: docsToProcess.length,
      batch_processed: batch.length,
      batch_success: results.success.length,
      batch_failed: results.failed.length,
      remaining,
      next_skip: remaining > 0 ? skipCount + batchSize : null,
      call_again: remaining > 0 ? { skip: skipCount + batchSize, batch_size: batchSize, force: forceRechunk } : null,
      details: results
    });

  } catch (error) {
    console.error('[chunkAll] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});