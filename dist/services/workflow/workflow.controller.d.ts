import { Request, Response } from 'express';
export declare class WorkflowController {
    static createWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getWorkflows(req: Request, res: Response): Promise<void>;
    static getWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deleteWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static startExecution(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getExecutions(req: Request, res: Response): Promise<void>;
    static getExecution(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createTrigger(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getTriggers(req: Request, res: Response): Promise<void>;
    static connectTriggerToWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getTemplates(req: Request, res: Response): Promise<void>;
    static createTemplateFromWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static handleWebhook(req: Request, res: Response): Promise<void>;
    static getWorkflowStats(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=workflow.controller.d.ts.map