import { db } from '../../lib/db';
import axios from 'axios';
import OpenAI from 'openai';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'ai_action';
  data: any;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string; // For conditional edges
}

interface ExecutionContext {
  executionId: string;
  tenantId: string;
  workflowData: any;
  variables: Record<string, any>;
  currentNode?: WorkflowNode;
}

export class WorkflowEngine {
  static async executeWorkflow(executionId: string, tenantId: string): Promise<void> {
    try {
      // Get execution and workflow data
      const execution = await db('workflow.executions')
        .where({ id: executionId, tenant_id: tenantId })
        .join('workflow.workflows', 'workflow.executions.workflow_id', 'workflow.workflows.id')
        .select(
          'workflow.executions.*',
          'workflow.workflows.nodes',
          'workflow.workflows.edges',
          'workflow.workflows.variables'
        )
        .first();

      if (!execution) {
        throw new Error('Execution not found');
      }

      const nodes: WorkflowNode[] = JSON.parse(execution.nodes || '[]');
      const edges: WorkflowEdge[] = JSON.parse(execution.edges || '[]');
      const variables: Record<string, any> = JSON.parse(execution.variables || '{}');
      const triggerData = JSON.parse(execution.trigger_data || '{}');

      const context: ExecutionContext = {
        executionId,
        tenantId,
        workflowData: triggerData,
        variables: { ...variables, trigger: triggerData },
      };

      // Find starting nodes (nodes with no incoming edges or trigger nodes)
      const startNodes = this.findStartNodes(nodes, edges);

      // Execute workflow starting from start nodes
      await this.executeNodeBatch(startNodes, nodes, edges, context);

      // Mark execution as completed
      await db('workflow.executions')
        .where({ id: executionId })
        .update({
          status: 'completed',
          completed_at: db.fn.now(),
          duration_ms: Date.now() - new Date(execution.started_at).getTime(),
        });

    } catch (error) {
      console.error('Workflow execution failed:', error);

      // Mark execution as failed
      await db('workflow.executions')
        .where({ id: executionId })
        .update({
          status: 'failed',
          completed_at: db.fn.now(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
          duration_ms: Date.now() - new Date((await db('workflow.executions').where({ id: executionId }).select('started_at').first())?.started_at || Date.now()).getTime(),
        });
    }
  }

  private static findStartNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const nodesWithIncoming = new Set(edges.map(edge => edge.target));
    return nodes.filter(node =>
      !nodesWithIncoming.has(node.id) ||
      node.type === 'trigger'
    );
  }

  private static async executeNodeBatch(
    currentNodes: WorkflowNode[],
    allNodes: WorkflowNode[],
    edges: WorkflowEdge[],
    context: ExecutionContext
  ): Promise<void> {
    const nextNodes: WorkflowNode[] = [];

    for (const node of currentNodes) {
      try {
        context.currentNode = node;

        // Create execution step
        const [stepId] = await db('workflow.execution_steps')
          .insert({
            execution_id: context.executionId,
            node_id: node.id,
            node_type: node.type,
            status: 'running',
            input_data: JSON.stringify(context.variables),
            started_at: db.fn.now(),
          })
          .returning('id');

        let outputData: any = {};

        // Execute node based on type
        switch (node.type) {
          case 'trigger':
            outputData = await this.executeTriggerNode(node, context);
            break;
          case 'action':
            outputData = await this.executeActionNode(node, context);
            break;
          case 'ai_action':
            outputData = await this.executeAINode(node, context);
            break;
          case 'condition':
            outputData = await this.executeConditionNode(node, context);
            break;
          case 'delay':
            await this.executeDelayNode(node, context);
            break;
          default:
            throw new Error(`Unknown node type: ${node.type}`);
        }

        // Update step as completed
        await db('workflow.execution_steps')
          .where({ id: stepId })
          .update({
            status: 'completed',
            output_data: JSON.stringify(outputData),
            completed_at: db.fn.now(),
            duration_ms: Date.now() - Date.now(), // Calculate properly
          });

        // Update context variables
        context.variables = { ...context.variables, ...outputData };

        // Find next nodes
        const outgoingEdges = edges.filter(edge => edge.source === node.id);
        for (const edge of outgoingEdges) {
          // Check edge conditions
          if (!edge.condition || this.evaluateCondition(edge.condition, context.variables)) {
            const nextNode = allNodes.find(n => n.id === edge.target);
            if (nextNode && !nextNodes.find(n => n.id === nextNode.id)) {
              nextNodes.push(nextNode);
            }
          }
        }

      } catch (error) {
        console.error(`Node execution failed: ${node.id}`, error);

        // Mark step as failed
        await db('workflow.execution_steps')
          .where({ execution_id: context.executionId, node_id: node.id })
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: db.fn.now(),
          });

        throw error;
      }
    }

    // Execute next batch if any
    if (nextNodes.length > 0) {
      await this.executeNodeBatch(nextNodes, allNodes, edges, context);
    }
  }

  private static async executeTriggerNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    // Trigger nodes just pass through the trigger data
    return { trigger: context.workflowData };
  }

  private static async executeActionNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const { action, config } = node.data;

    switch (action) {
      case 'send_email':
        return await this.sendEmail(config, context);

      case 'create_task':
        return await this.createTask(config, context);

      case 'update_record':
        return await this.updateRecord(config, context);

      case 'webhook':
        return await this.callWebhook(config, context);

      case 'wait_for_input':
        return await this.waitForInput(config, context);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private static async executeAINode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const { action, config } = node.data;

    // Get tenant AI config
    const tenant = await db('platform.tenants')
      .where({ id: context.tenantId })
      .select('ai_config')
      .first();

    if (!tenant?.ai_config) {
      throw new Error('AI provider not configured');
    }

    const aiConfig = JSON.parse(tenant.ai_config);
    const openai = new OpenAI({
      apiKey: aiConfig.apiKey,
    });

    switch (action) {
      case 'generate_text':
        const completion = await openai.chat.completions.create({
          model: config.model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: this.interpolateVariables(config.prompt, context.variables) }],
          max_tokens: config.max_tokens || 1000,
        });
        return { generated_text: completion.choices[0].message.content };

      case 'analyze_sentiment':
        const sentimentResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: `Analyze the sentiment of this text and respond with only: positive, negative, or neutral.\n\nText: ${this.interpolateVariables(config.text, context.variables)}`
          }],
          max_tokens: 10,
        });
        return { sentiment: sentimentResponse.choices[0].message.content?.toLowerCase().trim() };

      case 'summarize':
        const summaryResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: `Summarize the following text in ${config.length || '2-3 sentences'}:\n\n${this.interpolateVariables(config.text, context.variables)}`
          }],
          max_tokens: 500,
        });
        return { summary: summaryResponse.choices[0].message.content };

      default:
        throw new Error(`Unknown AI action: ${action}`);
    }
  }

  private static async executeConditionNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const { condition, value1, operator, value2 } = node.data;

    const result = this.evaluateCondition(
      `${this.interpolateVariables(value1, context.variables)} ${operator} ${this.interpolateVariables(value2, context.variables)}`,
      context.variables
    );

    return { condition_result: result, condition_value: result };
  }

  private static async executeDelayNode(node: WorkflowNode, context: ExecutionContext): Promise<void> {
    const { duration, unit } = node.data;

    let delayMs: number;
    switch (unit) {
      case 'seconds':
        delayMs = duration * 1000;
        break;
      case 'minutes':
        delayMs = duration * 60 * 1000;
        break;
      case 'hours':
        delayMs = duration * 60 * 60 * 1000;
        break;
      case 'days':
        delayMs = duration * 24 * 60 * 60 * 1000;
        break;
      default:
        delayMs = duration;
    }

    // In a real implementation, you'd use a job queue for delays
    // For now, we'll just wait (not recommended for production)
    await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, 30000))); // Max 30 seconds for demo
  }

  // Action implementations
  private static async sendEmail(config: any, context: ExecutionContext): Promise<any> {
    // In a real implementation, integrate with email service (SendGrid, AWS SES, etc.)
    console.log('Sending email:', {
      to: this.interpolateVariables(config.to, context.variables),
      subject: this.interpolateVariables(config.subject, context.variables),
      body: this.interpolateVariables(config.body, context.variables),
    });

    return { email_sent: true, recipient: config.to };
  }

  private static async createTask(config: any, context: ExecutionContext): Promise<any> {
    const [taskId] = await db('projects.tasks') // Assuming projects module exists
      .insert({
        tenant_id: context.tenantId,
        title: this.interpolateVariables(config.title, context.variables),
        description: this.interpolateVariables(config.description, context.variables),
        assigned_to: config.assigned_to,
        due_date: config.due_date,
        priority: config.priority || 'medium',
      })
      .returning('id');

    return { task_id: taskId, task_created: true };
  }

  private static async updateRecord(config: any, context: ExecutionContext): Promise<any> {
    const { table, record_id, updates } = config;

    // Simple record update (in production, add proper validation)
    const updateData: any = {};
    for (const [key, value] of Object.entries(updates)) {
      updateData[key] = this.interpolateVariables(value as string, context.variables);
    }

    await db(table).where({ id: record_id, tenant_id: context.tenantId }).update(updateData);

    return { record_updated: true, record_id };
  }

  private static async callWebhook(config: any, context: ExecutionContext): Promise<any> {
    const response = await axios.post(
      this.interpolateVariables(config.url, context.variables),
      {
        ...config.payload,
        workflow_data: context.variables,
      },
      {
        headers: config.headers || {},
      }
    );

    return { webhook_response: response.data, status_code: response.status };
  }

  private static async waitForInput(config: any, context: ExecutionContext): Promise<any> {
    // In a real implementation, this would pause execution and wait for user input
    // For now, just return a placeholder
    return { waiting_for_input: true, input_type: config.input_type };
  }

  // Utility methods
  private static interpolateVariables(text: string, variables: Record<string, any>): string {
    if (!text) return text;

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key]?.toString() || match;
    });
  }

  private static evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      // Simple condition evaluation (in production, use a proper expression evaluator)
      const interpolated = this.interpolateVariables(condition, variables);

      // Support basic operators
      if (interpolated.includes('===')) {
        const [left, right] = interpolated.split('===').map(s => s.trim());
        return left === right;
      }
      if (interpolated.includes('!==')) {
        const [left, right] = interpolated.split('!==').map(s => s.trim());
        return left !== right;
      }
      if (interpolated.includes('>')) {
        const [left, right] = interpolated.split('>').map(s => s.trim());
        return parseFloat(left) > parseFloat(right);
      }
      if (interpolated.includes('<')) {
        const [left, right] = interpolated.split('<').map(s => s.trim());
        return parseFloat(left) < parseFloat(right);
      }

      return Boolean(interpolated);
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  static checkConditions(eventData: any, conditions: Record<string, any>): boolean {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true;
    }

    // Simple condition checking (in production, implement more sophisticated logic)
    for (const [key, expectedValue] of Object.entries(conditions)) {
      if (eventData[key] !== expectedValue) {
        return false;
      }
    }

    return true;
  }
}
