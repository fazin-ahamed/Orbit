"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorController = void 0;
const db_1 = require("../../lib/db");
const zod_1 = require("zod");
const openai_1 = __importDefault(require("openai"));
// Vector storage schemas
const createVectorSchema = zod_1.z.object({
    content: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    source_id: zod_1.z.string().optional(),
});
const vectorSearchSchema = zod_1.z.object({
    query: zod_1.z.string(),
    top_k: zod_1.z.number().default(5),
    threshold: zod_1.z.number().default(0.7),
    source_filter: zod_1.z.string().optional(),
});
// Vector dimensions for OpenAI embeddings
const VECTOR_DIMENSIONS = 1536;
class VectorController {
    // Create embeddings and store vectors
    static async createVector(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const userId = req.user?.id || 'system';
            const { content, metadata, source_id } = createVectorSchema.parse(req.body);
            // Get tenant's AI configuration
            const tenant = await (0, db_1.db)('tenants')
                .where({ id: tenantId })
                .select('ai_config')
                .first();
            if (!tenant?.ai_config) {
                return res.status(400).json({ error: 'AI provider not configured for tenant' });
            }
            const aiConfig = JSON.parse(tenant.ai_config);
            if (!aiConfig.apiKey) {
                return res.status(400).json({ error: 'AI provider not properly configured' });
            }
            // Create embedding using OpenAI
            const openai = new openai_1.default({
                apiKey: aiConfig.apiKey,
            });
            const embeddingResponse = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: content,
            });
            const embedding = embeddingResponse.data[0].embedding;
            const tokensUsed = embeddingResponse.usage?.total_tokens || 0;
            // Store vector in database (ai.vectors table)
            const vectorData = {
                tenant_id: tenantId,
                source_id: source_id || '',
                content_chunk: content,
                embedding: `[${embedding.join(',')}]`, // PostgreSQL vector format
                metadata: JSON.stringify(metadata || {}),
            };
            // For now, store in a simple table (in production, use proper PGVector)
            await (0, db_1.db)('ai.vectors').insert(vectorData);
            // Record AI usage
            await (0, db_1.db)('billing.usage').insert({
                tenant_id: tenantId || '',
                resource: 'ai_tokens',
                quantity: tokensUsed,
                period_start: new Date(),
                period_end: new Date(),
                metadata: JSON.stringify({
                    operation: 'vector_embedding',
                    vector_count: 1,
                    content_length: content.length,
                }),
            });
            res.status(201).json({
                id: `vec_${Date.now()}`,
                embedding: embedding,
                tokens_used: tokensUsed,
                vector_stored: true,
            });
        }
        catch (error) {
            console.error('Error creating vector:', error);
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    // Search vectors using cosine similarity
    static async searchVectors(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const { query, top_k, threshold, source_filter } = vectorSearchSchema.parse(req.body);
            // Create embedding for the query
            const tenant = await (0, db_1.db)('tenants')
                .where({ id: tenantId })
                .select('ai_config')
                .first();
            if (!tenant?.ai_config) {
                return res.status(400).json({ error: 'AI provider not configured for tenant' });
            }
            const aiConfig = JSON.parse(tenant.ai_config);
            if (!aiConfig.apiKey) {
                return res.status(400).json({ error: 'AI provider not properly configured' });
            }
            const openai = new openai_1.default({
                apiKey: aiConfig.apiKey,
            });
            const embeddingResponse = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: query,
            });
            const queryEmbedding = embeddingResponse.data[0].embedding;
            // Search vectors using cosine similarity
            // Note: This is a simplified version. In production, use proper PGVector syntax
            let queryBuilder = (0, db_1.db)('ai.vectors')
                .where('tenant_id', tenantId)
                .select('*');
            if (source_filter) {
                queryBuilder = queryBuilder.where('source_id', source_filter);
            }
            const vectors = await queryBuilder.limit(top_k);
            // Calculate simple similarity scores (in production, use proper cosine similarity)
            const results = vectors.map(vector => {
                const vectorEmbedding = JSON.parse(vector.embedding);
                const similarity = calculateCosineSimilarity(queryEmbedding, vectorEmbedding);
                return {
                    id: vector.id,
                    content: vector.content_chunk,
                    metadata: JSON.parse(vector.metadata || '{}'),
                    similarity: similarity,
                    source_id: vector.source_id,
                };
            })
                .filter(result => result.similarity >= threshold)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, top_k);
            res.json({
                query: query,
                results: results,
                total_results: results.length,
            });
        }
        catch (error) {
            console.error('Error searching vectors:', error);
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    // Get vector statistics
    static async getVectorStats(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const stats = await (0, db_1.db)('ai.vectors')
                .where('tenant_id', tenantId)
                .select(db_1.db.raw('COUNT(*) as total_vectors'), db_1.db.raw('COUNT(DISTINCT source_id) as unique_sources'), db_1.db.raw('AVG(LENGTH(content_chunk)) as avg_content_length'))
                .first();
            res.json({
                total_vectors: parseInt(stats.total_vectors || '0'),
                unique_sources: parseInt(stats.unique_sources || '0'),
                avg_content_length: Math.round(parseFloat(stats.avg_content_length || '0')),
            });
        }
        catch (error) {
            console.error('Error fetching vector stats:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    // Delete vectors by source
    static async deleteVectorsBySource(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const userId = req.user?.id || 'system';
            const { source_id } = req.params;
            const deletedCount = await (0, db_1.db)('ai.vectors')
                .where('tenant_id', tenantId)
                .where('source_id', source_id)
                .del();
            res.json({
                message: 'Vectors deleted successfully',
                deleted_count: deletedCount,
            });
        }
        catch (error) {
            console.error('Error deleting vectors:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.VectorController = VectorController;
// Simple cosine similarity calculation
function calculateCosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        return 0;
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) {
        return 0;
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
//# sourceMappingURL=vector.controller.js.map