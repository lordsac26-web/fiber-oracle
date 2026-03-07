import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { document_id, content, title } = await req.json();

    if (!content && !document_id) {
      return Response.json({ error: 'Either document_id or content is required' }, { status: 400 });
    }

    let documentContent = content;
    let documentTitle = title;

    // Fetch document if only ID provided
    if (document_id && !content) {
      const doc = await base44.asServiceRole.entities.ReferenceDocument.get(document_id);
      documentContent = doc.content;
      documentTitle = doc.title;
    }

    // Fetch existing custom categories
    const customCategories = await base44.asServiceRole.entities.CustomCategory.filter({ is_active: true });

    const categoryList = [
      'installation',
      'troubleshooting',
      'maintenance',
      'safety',
      'specifications',
      'training',
      'other'
    ];

    // Build prompt with custom categories
    let categoriesDescription = 'Standard categories:\n' + categoryList.join(', ');
    
    if (customCategories.length > 0) {
      categoriesDescription += '\n\nCustom categories:\n';
      customCategories.forEach(cat => {
        categoriesDescription += `- ${cat.name}`;
        if (cat.description) categoriesDescription += `: ${cat.description}`;
        if (cat.keywords?.length) categoriesDescription += ` (keywords: ${cat.keywords.join(', ')})`;
        categoriesDescription += '\n';
      });
    }

    const prompt = `Analyze this technical document and suggest appropriate categories and tags.

Document Title: ${documentTitle}

Document Content Preview:
${documentContent.substring(0, 3000)}

${categoriesDescription}

Analyze the document and provide:
1. Primary category (choose from standard or custom categories above)
2. Additional custom categories that apply (up to 3)
3. Relevant tags/keywords (5-10 specific, searchable terms)
4. Confidence score for primary category (0-100)

Consider:
- Technical topics covered
- Document purpose (guide, reference, troubleshooting, etc.)
- Equipment/technology mentioned
- Use cases described`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          primary_category: { type: 'string' },
          additional_categories: {
            type: 'array',
            items: { type: 'string' }
          },
          suggested_tags: {
            type: 'array',
            items: { type: 'string' }
          },
          confidence_score: { type: 'number' },
          reasoning: { type: 'string' }
        },
        required: ['primary_category', 'suggested_tags', 'confidence_score']
      }
    });

    // Update document if ID provided
    if (document_id) {
      await base44.asServiceRole.entities.ReferenceDocument.update(document_id, {
        category: result.primary_category,
        custom_categories: result.additional_categories || [],
        suggested_tags: result.suggested_tags,
        tags_confirmed: false,
        ai_category_suggestions: [{
          primary_category: result.primary_category,
          additional_categories: result.additional_categories,
          confidence_score: result.confidence_score,
          reasoning: result.reasoning,
          suggested_at: new Date().toISOString()
        }]
      });
    }

    return Response.json({
      success: true,
      suggestions: result
    });

  } catch (error) {
    console.error('Error suggesting categories:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});