import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { document_ids, category, custom_categories, tags, operation = 'set' } = await req.json();

    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return Response.json({ error: 'document_ids array is required' }, { status: 400 });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const docId of document_ids) {
      try {
        const updates = {};

        if (category) {
          updates.category = category;
        }

        if (custom_categories) {
          if (operation === 'set') {
            updates.custom_categories = custom_categories;
          } else if (operation === 'add') {
            const doc = await base44.asServiceRole.entities.ReferenceDocument.get(docId);
            const existing = doc.custom_categories || [];
            updates.custom_categories = [...new Set([...existing, ...custom_categories])];
          }
        }

        if (tags) {
          if (operation === 'set') {
            updates.tags = tags;
            updates.tags_confirmed = true;
          } else if (operation === 'add') {
            const doc = await base44.asServiceRole.entities.ReferenceDocument.get(docId);
            const existing = doc.tags || [];
            updates.tags = [...new Set([...existing, ...tags])];
            updates.tags_confirmed = true;
          }
        }

        await base44.asServiceRole.entities.ReferenceDocument.update(docId, updates);
        results.successful.push(docId);
      } catch (error) {
        results.failed.push({
          document_id: docId,
          error: error.message
        });
      }
    }

    // Update category document counts
    if (category || custom_categories) {
      const categoriesToUpdate = [category, ...(custom_categories || [])].filter(Boolean);
      
      for (const catName of categoriesToUpdate) {
        const existingCat = await base44.asServiceRole.entities.CustomCategory.filter({ name: catName });
        
        if (existingCat.length > 0) {
          const docCount = await base44.asServiceRole.entities.ReferenceDocument.filter({
            custom_categories: catName
          });
          
          await base44.asServiceRole.entities.CustomCategory.update(existingCat[0].id, {
            document_count: docCount.length
          });
        }
      }
    }

    return Response.json({
      success: true,
      results,
      total_processed: document_ids.length,
      successful_count: results.successful.length,
      failed_count: results.failed.length
    });

  } catch (error) {
    console.error('Error in batch update:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});