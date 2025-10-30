import { Request, Response } from 'express';
export declare class CRMController {
    static createContact(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getContacts(req: Request, res: Response): Promise<void>;
    static getContact(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateContact(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createLead(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getLeads(req: Request, res: Response): Promise<void>;
    static updateLead(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getPipelines(req: Request, res: Response): Promise<void>;
    static createPipeline(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createActivity(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getActivities(req: Request, res: Response): Promise<void>;
    static getDashboardStats(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=crm.controller.d.ts.map