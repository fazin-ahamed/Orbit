export declare class WorkflowEngine {
    static executeWorkflow(executionId: string, tenantId: string): Promise<void>;
    private static findStartNodes;
    private static executeNodeBatch;
    private static executeTriggerNode;
    private static executeActionNode;
    private static executeAINode;
    private static executeConditionNode;
    private static executeDelayNode;
    private static sendEmail;
    private static createTask;
    private static updateRecord;
    private static callWebhook;
    private static waitForInput;
    private static interpolateVariables;
    private static evaluateCondition;
    static checkConditions(eventData: any, conditions: Record<string, any>): boolean;
}
//# sourceMappingURL=workflow.engine.d.ts.map