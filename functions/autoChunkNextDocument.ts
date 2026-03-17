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

/**
 * autoChunkNextDocument — Finds the next unchunked document and processes it.
 * Designed to be called by a scheduled automation every 5 minutes.
 * Processes exactly 1 document per invocation to stay within rate limits.
 * 
 * NOTE: Scheduled automations have NO user context, so we skip auth.me()
 * and use asServiceRole for all entity operations.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    // Find next unchunked document by scanning in batches
    // We fetch lightweight metadata only (no content field) to avoid JSON parse failures
    let targetDoc = null;
    let offset = 0;
    let scanned = 0;

    while (!targetDoc && offset < 500) {
      let docs;
      try {
        const raw = await base44.asServiceRole.entities.ReferenceDocument.list('created_date', 50, offset);
        if (typeof raw === 'string') {
          try { docs = JSON.parse(raw); } catch { docs = []; }
        } else if (Array.isArray(raw)) {
          docs = raw;
        } else {
          docs = [];
        }
      } catch (e) {
        if (e.message?.includes('Rate limit')) {
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        console.warn(`[autoChunk] List error at offset ${offset}:`, e.message);
        offset += 50;
        continue;
      }

      if (docs.length === 0) break;
      scanned += docs.length;

      for (const doc of docs) {
        if (doc.is_active !== false && doc.content && doc.content.length > 20 && !doc.metadata?.chunked_at) {
          targetDoc = doc;
          break;
        }
      }

      if (!targetDoc) offset += docs.length;
    }

    if (!targetDoc) {
      console.log(`[autoChunk] No unchunked documents found after scanning ${scanned} docs.`);
      return Response.json({
        status: 'complete',
        message: 'All documents are chunked.',
        scanned
      });
    }

    console.log(`[autoChunk] Processing "${targetDoc.title}" (${targetDoc.content.length} chars)`);

    // Chunk the content
    const content = targetDoc.content;
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
          document_id: targetDoc.id,
          document_title: targetDoc.title,
          document_category: targetDoc.category || 'uncategorized',
          chunk_index: chunkIndex,
          content: chunkContent,
          keywords: extractKeywords(chunkContent),
          token_count: Math.ceil(chunkContent.length / 4),
          metadata: {
            source_type: targetDoc.source_type,
            source_url: targetDoc.source_url,
            tags: targetDoc.tags || []
          }
        });
        chunkIndex++;
      }
      startPos = actualEnd - CHUNK_OVERLAP_CHARS;
      if (startPos >= content.length - CHUNK_OVERLAP_CHARS) break;
    }

    console.log(`[autoChunk] Created ${chunks.length} chunks`);

    // Delete any existing chunks for this doc
    try {
      const raw = await base44.asServiceRole.entities.DocumentChunk.filter({ document_id: targetDoc.id });
      let existingChunks;
      if (typeof raw === 'string') existingChunks = JSON.parse(raw);
      else if (Array.isArray(raw)) existingChunks = raw;
      else existingChunks = [];

      for (const old of existingChunks) {
        await base44.asServiceRole.entities.DocumentChunk.delete(old.id);
      }
    } catch (e) { /* no old chunks */ }

    // Store chunks with aggressive rate limit handling
    let storedCount = 0;
    for (let i = 0; i < chunks.length; i += 10) {
      let retries = 0;
      while (retries < 6) {
        try {
          await base44.asServiceRole.entities.DocumentChunk.bulkCreate(chunks.slice(i, i + 10));
          storedCount += Math.min(10, chunks.length - i);
          // Delay between batches
          await new Promise(r => setTimeout(r, 800));
          break;
        } catch (e) {
          if (e.message?.includes('Rate limit') && retries < 5) {
            retries++;
            const delay = retries * 3000;
            console.warn(`[autoChunk] Rate limited, waiting ${delay/1000}s (retry ${retries}/5)...`);
            await new Promise(r => setTimeout(r, delay));
          } else {
            console.error(`[autoChunk] Failed to store batch at index ${i}:`, e.message);
            throw e;
          }
        }
      }
    }

    // Mark document as chunked
    await base44.asServiceRole.entities.ReferenceDocument.update(targetDoc.id, {
      metadata: {
        ...targetDoc.metadata,
        chunk_count: chunks.length,
        chunked_at: new Date().toISOString(),
        total_chars: content.length
      }
    });

    console.log(`[autoChunk] Done: "${targetDoc.title}" -> ${storedCount} chunks stored`);

    return Response.json({
      status: 'chunked',
      document_id: targetDoc.id,
      title: targetDoc.title,
      chunks_created: chunks.length,
      chunks_stored: storedCount,
      content_length: content.length
    });

  } catch (error) {
    console.error('[autoChunk] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});