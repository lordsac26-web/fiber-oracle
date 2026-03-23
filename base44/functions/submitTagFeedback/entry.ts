import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { 
      document_id, 
      confirmed_category, 
      confirmed_tags, 
      user_notes 
    } = await req.json();

    if (!document_id) {
      return Response.json({ error: 'document_id is required' }, { status: 400 });
    }

    // Fetch document
    const doc = await base44.asServiceRole.entities.ReferenceDocument.get(document_id);

    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Extract AI suggestions
    const aiSuggestion = doc.ai_category_suggestions?.[0];
    const aiCategory = aiSuggestion?.primary_category || doc.category;
    const aiTags = doc.suggested_tags || [];

    // Determine feedback type
    let feedbackType = 'accepted';
    if (confirmed_category !== aiCategory) {
      feedbackType = 'modified';
    }
    
    const tagsAdded = confirmed_tags.filter(t => !aiTags.includes(t));
    const tagsRemoved = aiTags.filter(t => !confirmed_tags.includes(t));
    
    if (tagsAdded.length > 0 || tagsRemoved.length > 0) {
      feedbackType = 'modified';
    }

    // Store feedback
    await base44.asServiceRole.entities.TagFeedback.create({
      document_id,
      ai_suggested_category: aiCategory,
      user_confirmed_category: confirmed_category,
      ai_suggested_tags: aiTags,
      user_confirmed_tags: confirmed_tags,
      tags_added: tagsAdded,
      tags_removed: tagsRemoved,
      feedback_type: feedbackType,
      confidence_score: aiSuggestion?.confidence_score || 0,
      user_notes: user_notes || ''
    });

    // Update document
    await base44.asServiceRole.entities.ReferenceDocument.update(document_id, {
      category: confirmed_category,
      tags: confirmed_tags,
      tags_confirmed: true
    });

    return Response.json({
      success: true,
      feedback_type: feedbackType,
      tags_added: tagsAdded.length,
      tags_removed: tagsRemoved.length
    });

  } catch (error) {
    console.error('Error submitting tag feedback:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});