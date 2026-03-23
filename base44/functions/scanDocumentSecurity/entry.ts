import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { submission_id } = await req.json();

        if (!submission_id) {
            return Response.json({ error: 'submission_id is required' }, { status: 400 });
        }

        // Get the submission
        const submission = await base44.asServiceRole.entities.DocumentSubmission.get(submission_id);

        if (!submission) {
            return Response.json({ error: 'Submission not found' }, { status: 404 });
        }

        // Update status to scanning
        await base44.asServiceRole.entities.DocumentSubmission.update(submission_id, {
            security_scan_status: 'scanning'
        });

        const content = submission.content || '';
        const title = submission.title || '';
        
        // Security checks
        const threats = [];
        const warnings = [];

        // Check for suspicious patterns
        const suspiciousPatterns = [
            { pattern: /<script[^>]*>.*?<\/script>/gi, threat: 'JavaScript code detected' },
            { pattern: /javascript:/gi, threat: 'JavaScript protocol detected' },
            { pattern: /on\w+\s*=\s*["'][^"']*["']/gi, threat: 'Event handler attributes detected' },
            { pattern: /eval\s*\(/gi, threat: 'eval() function detected' },
            { pattern: /document\.cookie/gi, threat: 'Cookie access detected' },
            { pattern: /window\.location/gi, threat: 'Window location manipulation detected' },
            { pattern: /<iframe/gi, threat: 'iframe element detected' },
            { pattern: /<embed/gi, threat: 'embed element detected' },
            { pattern: /<object/gi, threat: 'object element detected' }
        ];

        for (const { pattern, threat } of suspiciousPatterns) {
            if (pattern.test(content) || pattern.test(title)) {
                threats.push(threat);
            }
        }

        // Check for excessively long content (possible DoS)
        if (content.length > 10000000) { // 10MB
            warnings.push('Content exceeds 10MB - may impact performance');
        }

        // Check for SQL injection patterns (just in case)
        const sqlPatterns = [
            /union\s+select/gi,
            /drop\s+table/gi,
            /insert\s+into/gi,
            /delete\s+from/gi
        ];

        for (const pattern of sqlPatterns) {
            if (pattern.test(content)) {
                warnings.push('SQL-like patterns detected');
                break;
            }
        }

        // Use LLM for advanced content analysis
        const llmAnalysis = await base44.integrations.Core.InvokeLLM({
            prompt: `Analyze this document content for security risks. Look for:
- Malicious instructions or social engineering
- Phishing attempts
- Misleading information designed to cause harm
- Instructions to bypass security measures
- Executable code or malware indicators

Document title: "${title}"
Content preview: "${content.substring(0, 2000)}"

Respond with a JSON object indicating if the content is safe.`,
            response_json_schema: {
                type: "object",
                properties: {
                    is_safe: { type: "boolean" },
                    risk_level: { type: "string", enum: ["none", "low", "medium", "high"] },
                    concerns: { type: "array", items: { type: "string" } },
                    recommendation: { type: "string" }
                }
            }
        });

        if (llmAnalysis.concerns && llmAnalysis.concerns.length > 0) {
            warnings.push(...llmAnalysis.concerns);
        }

        const scanPassed = threats.length === 0 && llmAnalysis.is_safe && llmAnalysis.risk_level !== 'high';

        const scanResult = {
            timestamp: new Date().toISOString(),
            threats_found: threats,
            warnings: warnings,
            llm_analysis: llmAnalysis,
            overall_status: scanPassed ? 'passed' : 'failed',
            scanned_by: user.email
        };

        // Update submission with scan results
        await base44.asServiceRole.entities.DocumentSubmission.update(submission_id, {
            security_scan_status: scanPassed ? 'passed' : 'failed',
            security_scan_result: scanResult
        });

        return Response.json({
            success: true,
            scan_result: scanResult
        });

    } catch (error) {
        console.error('Security scan error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});