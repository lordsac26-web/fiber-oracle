import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ~2000 chars per chunk with 200 char overlap for context continuity
const CHUNK_SIZE_CHARS = 2000;
const CHUNK_OVERLAP_CHARS = 200;

// Extract meaningful keywords from text
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

  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s\-\.]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  const freq = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word]) => word)
    .join(' ');
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const { document_id, _service_call } = await req.json();
    
    // Allow service-role calls from chunkAllDocuments (they pass _service_call flag)
    // Otherwise require admin auth
    if (!_service_call) {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
      }
    }

    if (!document_id) {
      return Response.json({ error: 'document_id is required' }, { status: 400 });
    }

    // Fetch document by ID (single doc fetch works fine even for large content)
    const doc = await base44.asServiceRole.entities.ReferenceDocument.get(document_id);
    if (!doc || !doc.content) {
      return Response.json({ error: 'Document not found or has no content' }, { status: 404 });
    }

    console.log(`[chunk] Processing "${doc.title}" (${doc.content.length} chars)`);

    const content = doc.content;
    const chunks = [];
    let startPos = 0;
    let chunkIndex = 0;

    while (startPos < content.length) {
      const endPos = Math.min(startPos + CHUNK_SIZE_CHARS, content.length);
      
      // Try to break at sentence/paragraph boundary
      let actualEnd = endPos;
      if (endPos < content.length) {
        const paraBreak = content.lastIndexOf('\n\n', endPos);
        if (paraBreak > startPos + CHUNK_SIZE_CHARS * 0.5) {
          actualEnd = paraBreak + 2;
        } else {
          const sentBreak = content.lastIndexOf('. ', endPos);
          if (sentBreak > startPos + CHUNK_SIZE_CHARS * 0.5) {
            actualEnd = sentBreak + 2;
          }
        }
      }

      const chunkContent = content.substring(startPos, actualEnd).trim();
      if (chunkContent.length > 10) {
        chunks.push({
          document_id: document_id,
          document_title: doc.title,
          document_category: doc.category || 'uncategorized',
          chunk_index: chunkIndex,
          content: chunkContent,
          keywords: extractKeywords(chunkContent),
          token_count: Math.ceil(chunkContent.length / 4),
          metadata: {
            source_type: doc.source_type,
            source_url: doc.source_url,
            tags: doc.tags || []
          }
        });
        chunkIndex++;
      }

      startPos = actualEnd - CHUNK_OVERLAP_CHARS;
      if (startPos >= content.length - CHUNK_OVERLAP_CHARS) break;
    }

    console.log(`[chunk] Created ${chunks.length} chunks`);

    // Delete existing chunks for this document
    let existingChunks = [];
    try {
      const raw = await base44.asServiceRole.entities.DocumentChunk.filter({ document_id });
      if (typeof raw === 'string') {
        existingChunks = JSON.parse(raw);
      } else if (Array.isArray(raw)) {
        existingChunks = raw;
      }
    } catch (e) {
      // No existing chunks, fine
    }

    if (existingChunks.length > 0) {
      console.log(`[chunk] Deleting ${existingChunks.length} old chunks`);
      for (const old of existingChunks) {
        await base44.asServiceRole.entities.DocumentChunk.delete(old.id);
      }
    }

    // Store new chunks in batches of 20
    let stored = 0;
    for (let i = 0; i < chunks.length; i += 20) {
      const batch = chunks.slice(i, i + 20);
      await base44.asServiceRole.entities.DocumentChunk.bulkCreate(batch);
      stored += batch.length;
    }

    console.log(`[chunk] Stored ${stored} chunks`);

    // Update document metadata
    await base44.asServiceRole.entities.ReferenceDocument.update(document_id, {
      metadata: {
        ...doc.metadata,
        chunk_count: chunks.length,
        chunked_at: new Date().toISOString(),
        total_chars: content.length
      }
    });

    return Response.json({
      success: true,
      document_id,
      document_title: doc.title,
      chunks_created: chunks.length,
      total_chars: content.length
    });

  } catch (error) {
    console.error('[chunk] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});