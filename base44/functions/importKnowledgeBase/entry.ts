import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Only admins can import knowledge base
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { documents, merge_strategy = 'skip' } = await req.json();

        if (!documents || !Array.isArray(documents)) {
            return Response.json({ error: 'Invalid import data' }, { status: 400 });
        }

        const results = {
            total: documents.length,
            imported: 0,
            skipped: 0,
            updated: 0,
            errors: []
        };

        for (const doc of documents) {
            try {
                // Check if document already exists by title and version
                const existing = await base44.asServiceRole.entities.ReferenceDocument.filter({
                    title: doc.title,
                    version: doc.version
                });

                if (existing.length > 0) {
                    if (merge_strategy === 'skip') {
                        results.skipped++;
                        continue;
                    } else if (merge_strategy === 'update') {
                        await base44.asServiceRole.entities.ReferenceDocument.update(existing[0].id, {
                            content: doc.content,
                            metadata: doc.metadata,
                            comments: doc.comments,
                            annotations: doc.annotations,
                            is_active: doc.is_active,
                            source_url: doc.source_url
                        });
                        results.updated++;
                        continue;
                    }
                }

                // Create new document
                await base44.asServiceRole.entities.ReferenceDocument.create({
                    title: doc.title,
                    category: doc.category || 'other',
                    version: doc.version || '1.0',
                    source_type: doc.source_type || 'pdf',
                    source_url: doc.source_url || '',
                    content: doc.content || '',
                    metadata: doc.metadata || {},
                    comments: doc.comments || '',
                    annotations: doc.annotations || [],
                    is_active: doc.is_active !== false,
                    parent_document_id: doc.parent_document_id || null,
                    is_latest_version: doc.is_latest_version !== false
                });

                results.imported++;

            } catch (docError) {
                results.errors.push({
                    title: doc.title,
                    error: docError.message
                });
            }
        }

        return Response.json({
            success: true,
            results
        });

    } catch (error) {
        console.error('Import error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});