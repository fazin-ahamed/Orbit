import { Request, Response } from 'express';
import { db } from '../../lib/db';
import { z } from 'zod';
import OpenAI from 'openai';

// Vector storage schemas
const createVectorSchema = z.object({
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  source_id: z.string().optional(),
});

const vectorSearchSchema = z.object({
  query: z.string(),
  top_k: z.number().default(5),
  threshold: z.number().default(0.7),
  source_filter: z.string().optional(),
});

// Vector dimensions for OpenAI embeddings
const VECTOR_DIMENSIONS = 1536;

export class VectorController {
  // Create embeddings and store vectors
  static async createVector(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const userId = (req.user as any)?.id || 'system';
      const { content, metadata, source_id } = createVectorSchema.parse(req.body);

      // Get tenant's AI configuration
      const tenant = await db('tenants')
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
      const openai = new OpenAI({
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
      await db('ai.vectors').insert(vectorData);

      // Record AI usage
      await db('billing.usage').insert({
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

    } catch (error) {
      console.error('Error creating vector:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Search vectors using cosine similarity
  static async searchVectors(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const { query, top_k, threshold, source_filter } = vectorSearchSchema.parse(req.body);

      // Create embedding for the query
      const tenant = await db('tenants')
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

      const openai = new OpenAI({
        apiKey: aiConfig.apiKey,
      });

      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Search vectors using cosine similarity
      // Note: This is a simplified version. In production, use proper PGVector syntax
      let queryBuilder = db('ai.vectors')
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

    } catch (error) {
      console.error('Error searching vectors:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get vector statistics
  static async getVectorStats(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';

      const stats = await db('ai.vectors')
        .where('tenant_id', tenantId)
        .select(
          db.raw('COUNT(*) as total_vectors'),
          db.raw('COUNT(DISTINCT source_id) as unique_sources'),
          db.raw('AVG(LENGTH(content_chunk)) as avg_content_length')
        )
        .first() as any;

      res.json({
        total_vectors: parseInt(stats?.total_vectors?.toString() || '0'),
        unique_sources: parseInt(stats?.unique_sources?.toString() || '0'),
        avg_content_length: Math.round(parseFloat(stats?.avg_content_length?.toString() || '0')),
      });

    } catch (error) {
      console.error('Error fetching vector stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete vectors by source
  static async deleteVectorsBySource(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const userId = (req.user as any)?.id || 'system';
      const { source_id } = req.params;

      const deletedCount = await db('ai.vectors')
        .where('tenant_id', tenantId)
        .where('source_id', source_id)
        .del();

      res.json({
        message: 'Vectors deleted successfully',
        deleted_count: deletedCount,
      });

    } catch (error) {
      console.error('Error deleting vectors:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// Simple cosine similarity calculation
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
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