import { Request, Response } from 'express';
import { db } from '../../lib/db';
import { z } from 'zod';
import OpenAI from 'openai';
import axios from 'axios';

// AI request schemas
const chatCompletionSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })),
  model: z.string().optional(),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
  stream: z.boolean().optional(),
});

const embeddingSchema = z.object({
  input: z.union([z.string(), z.array(z.string())]),
  model: z.string().optional(),
});

const ragQuerySchema = z.object({
  query: z.string(),
  top_k: z.number().default(5),
  threshold: z.number().default(0.7),
});

// AI Provider interface
interface AIProvider {
  name: string;
  baseUrl?: string;
  apiKey: string;
  models: {
    chat: string;
    embedding: string;
  };
}

// Provider configurations
const AI_PROVIDERS: Record<string, AIProvider> = {
  openai: {
    name: 'openai',
    apiKey: process.env.OPENAI_API_KEY || '',
    models: {
      chat: 'gpt-4o-mini',
      embedding: 'text-embedding-3-small',
    },
  },
  groq: {
    name: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY || '',
    models: {
      chat: 'llama3-8b-8192',
      embedding: 'text-embedding-3-small', // Will need alternative
    },
  },
};

export class AIController {
  // Get available AI providers and models
  static async getProviders(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';

      // Get tenant's AI configuration
      const tenantConfig = await db('tenants')
        .where({ id: tenantId })
        .select('ai_config')
        .first();

      const providers = Object.keys(AI_PROVIDERS).map(providerKey => {
        const provider = AI_PROVIDERS[providerKey];
        return {
          id: providerKey,
          name: provider.name,
          models: provider.models,
          configured: !!provider.apiKey,
        };
      });

      res.json({
        providers,
        tenantConfig: tenantConfig?.ai_config || null,
      });
    } catch (error) {
      console.error('Error fetching AI providers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Configure AI provider for tenant
  static async configureProvider(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const userId = (req.user as any)?.id || 'system';
      const { provider, apiKey, models } = req.body;

      // Validate provider
      if (!AI_PROVIDERS[provider]) {
        return res.status(400).json({ error: 'Invalid AI provider' });
      }

      // Update tenant AI configuration
      const aiConfig = {
        provider,
        apiKey: apiKey || AI_PROVIDERS[provider].apiKey,
        models: models || AI_PROVIDERS[provider].models,
        configured: true,
        configuredAt: new Date(),
        configuredBy: userId,
      };

      await db('tenants')
        .where({ id: tenantId })
        .update({
          ai_config: JSON.stringify(aiConfig),
          updated_at: db.fn.now(),
        });

      // Log configuration
      await db('audit_logs').insert({
        tenant_id: tenantId || '',
        user_id: userId || '',
        action: 'ai_provider_configured',
        resource: 'ai_config',
        details: { provider, configured: true },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        outcome: 'success'
      });

      res.json({ message: 'AI provider configured successfully', config: aiConfig });
    } catch (error) {
      console.error('Error configuring AI provider:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create chat completion
  static async createChatCompletion(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const userId = (req.user as any)?.id || 'system';
      const { messages, model, max_tokens, temperature, stream } = chatCompletionSchema.parse(req.body);

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get tenant's AI configuration
      const tenant = await db('tenants')
        .where({ id: tenantId })
        .select('ai_config')
        .first();

      if (!tenant?.ai_config) {
        return res.status(400).json({ error: 'AI provider not configured for tenant' });
      }

      const aiConfig = JSON.parse(tenant.ai_config);
      const provider = AI_PROVIDERS[aiConfig.provider];

      if (!provider || !provider.apiKey) {
        return res.status(400).json({ error: 'AI provider not properly configured' });
      }

      // Initialize OpenAI client (works with OpenAI and Groq)
      const openai = new OpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl,
      });

      const startTime = Date.now();

      // Create completion
      const completion = await openai.chat.completions.create({
        model: model || aiConfig.models?.chat || provider.models.chat,
        messages: messages,
        max_tokens: max_tokens || 1000,
        temperature: temperature || 0.7,
        stream: stream || false,
      });

      const responseTime = Date.now() - startTime;

      // Handle response (OpenAI SDK returns ChatCompletion for regular requests)
      const responseMessage = (completion as any).choices[0].message;
      const usage = (completion as any).usage;

      // Calculate token usage (approximate)
      const promptTokens = JSON.stringify(messages).length / 4; // Rough estimate
      const completionTokens = usage?.completion_tokens || 0;
      const totalTokens = usage?.total_tokens || promptTokens + completionTokens;

      // Record AI usage
      await db('billing.usage').insert({
        tenant_id: tenantId || '',
        resource: 'ai_tokens',
        quantity: Math.ceil(totalTokens),
        period_start: new Date(),
        period_end: new Date(),
        metadata: JSON.stringify({
          provider: provider.name,
          model: model || aiConfig.models?.chat || provider.models.chat,
          operation: 'chat_completion',
          response_time: responseTime,
        }),
      });

      // Log AI request
      await db('audit_logs').insert({
        tenant_id: tenantId || '',
        user_id: userId || '',
        action: 'ai_chat_completion',
        resource: 'ai_request',
        details: {
          provider: provider.name,
          model: model || aiConfig.models?.chat || provider.models.chat,
          tokens_used: Math.ceil(totalTokens),
          response_time: responseTime,
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        outcome: 'success'
      });

      res.json({
        response: responseMessage,
        usage: {
          prompt_tokens: Math.ceil(promptTokens),
          completion_tokens: completionTokens,
          total_tokens: Math.ceil(totalTokens),
        },
        provider: provider.name,
        model: model || aiConfig.models?.chat || provider.models.chat,
      });

    } catch (error) {
      console.error('Error creating chat completion:', error);

      // Record failed request
      if (req.tenantId && (req.user as any)?.id) {
        await db('audit_logs').insert({
          tenant_id: req.tenantId || '',
          user_id: (req.user as any)?.id || '',
          action: 'ai_chat_completion',
          resource: 'ai_request',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          outcome: 'failure'
        }).catch(logError => console.error('Failed to log AI error:', logError));
      }

      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create embeddings
  static async createEmbedding(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const userId = (req.user as any)?.id || 'system';
      const { input, model } = embeddingSchema.parse(req.body);

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get tenant's AI configuration
      const tenant = await db('tenants')
        .where({ id: tenantId })
        .select('ai_config')
        .first();

      if (!tenant?.ai_config) {
        return res.status(400).json({ error: 'AI provider not configured for tenant' });
      }

      const aiConfig = JSON.parse(tenant.ai_config);
      const provider = AI_PROVIDERS[aiConfig.provider];

      if (!provider || !provider.apiKey) {
        return res.status(400).json({ error: 'AI provider not properly configured' });
      }

      // For now, use OpenAI for embeddings (Groq doesn't support embeddings)
      const openai = new OpenAI({
        apiKey: provider.apiKey,
      });

      const startTime = Date.now();

      const embeddingResponse = await openai.embeddings.create({
        model: model || 'text-embedding-3-small',
        input: input,
      });

      const responseTime = Date.now() - startTime;
      const tokensUsed = embeddingResponse.usage?.total_tokens || 0;

      // Record AI usage
      await db('billing.usage').insert({
        tenant_id: tenantId || '',
        resource: 'ai_tokens',
        quantity: tokensUsed,
        period_start: new Date(),
        period_end: new Date(),
        metadata: JSON.stringify({
          provider: provider.name,
          model: model || 'text-embedding-3-small',
          operation: 'embedding',
          response_time: responseTime,
        }),
      });

      // Log AI request
      await db('audit_logs').insert({
        tenant_id: tenantId || '',
        user_id: userId || '',
        action: 'ai_embedding',
        resource: 'ai_request',
        details: {
          provider: provider.name,
          model: model || 'text-embedding-3-small',
          tokens_used: tokensUsed,
          response_time: responseTime,
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        outcome: 'success'
      });

      res.json({
        embeddings: embeddingResponse.data,
        usage: {
          tokens_used: tokensUsed,
        },
        provider: provider.name,
        model: model || 'text-embedding-3-small',
      });

    } catch (error) {
      console.error('Error creating embedding:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get AI usage statistics
  static async getUsage(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';

      // Get current month's AI usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const usage = await db('billing.usage')
        .where({ tenant_id: tenantId })
        .where('resource', 'ai_tokens')
        .where('period_start', '>=', startOfMonth)
        .select('quantity', 'period_start', 'metadata')
        .orderBy('period_start', 'desc');

      // Aggregate usage by day
      const dailyUsage = usage.reduce((acc, record) => {
        const date = record.period_start.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += record.quantity;
        return acc;
      }, {});

      const totalTokens = usage.reduce((sum, record) => sum + record.quantity, 0);

      res.json({
        period: {
          start: startOfMonth.toISOString(),
          current: new Date().toISOString(),
        },
        total_tokens: totalTokens,
        daily_usage: dailyUsage,
        requests: usage.length,
      });
    } catch (error) {
      console.error('Error fetching AI usage:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Test AI connectivity
  static async testConnection(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';

      // Get tenant's AI configuration
      const tenant = await db('tenants')
        .where({ id: tenantId })
        .select('ai_config')
        .first();

      if (!tenant?.ai_config) {
        return res.status(400).json({ error: 'AI provider not configured' });
      }

      const aiConfig = JSON.parse(tenant.ai_config);
      const provider = AI_PROVIDERS[aiConfig.provider];

      if (!provider || !provider.apiKey) {
        return res.status(400).json({ error: 'AI provider not properly configured' });
      }

      // Test with a simple chat completion
      const openai = new OpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl,
      });

      const startTime = Date.now();
      const testResponse = await openai.chat.completions.create({
        model: provider.models.chat,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      });
      const responseTime = Date.now() - startTime;

      res.json({
        status: 'connected',
        provider: provider.name,
        model: provider.models.chat,
        responseTime: `${responseTime}ms`,
        message: 'AI provider connected successfully',
      });

    } catch (error) {
      console.error('AI connection test failed:', error);
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'AI provider connection failed',
      });
    }
  }
}