import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Only admins can export knowledge base
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Fetch all reference documents
        const documents = await base44.asServiceRole.entities.ReferenceDocument.list();

        // Create comprehensive export
        const exportData = {
            exported_at: new Date().toISOString(),
            exported_by: user.email,
            version: '1.0',
            total_documents: documents.length,
            documents: documents.map(doc => ({
                id: doc.id,
                title: doc.title,
                category: doc.category,
                version: doc.version,
                source_type: doc.source_type,
                source_url: doc.source_url,
                content: doc.content,
                metadata: doc.metadata,
                comments: doc.comments,
                annotations: doc.annotations,
                is_active: doc.is_active,
                parent_document_id: doc.parent_document_id,
                is_latest_version: doc.is_latest_version,
                created_date: doc.created_date,
                updated_date: doc.updated_date
            }))
        };

        // Return as JSON
        return Response.json(exportData, {
            headers: {
                'Content-Disposition': `attachment; filename=knowledge-base-export-${new Date().toISOString().split('T')[0]}.json`
            }
        });

    } catch (error) {
        console.error('Export error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});