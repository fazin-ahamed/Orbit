import { Request, Response } from 'express';
export declare class WorkflowController {
    static createWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getWorkflows(req: Request, res: Response): Promise<void>;
    static getWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static startExecution(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getExecutions(req: Request, res: Response): Promise<void>;
    static getExecution(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createTrigger(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getTriggers(req: Request, res: Response): Promise<void>;
    static connectTriggerToWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getTemplates(req: Request, res: Response): Promise<void>;
    static createTemplateFromWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static handleWebhook(req: Request, res: Response): Promise<void>;
    static getWorkflowStats(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=workflow.controller.d.ts.map