import { Request, Response } from 'express';
export declare class CRMController {
    static createContact(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getContacts(req: Request, res: Response): Promise<void>;
    static getContact(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateContact(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createLead(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getLeads(req: Request, res: Response): Promise<void>;
    static updateLead(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getPipelines(req: Request, res: Response): Promise<void>;
    static createPipeline(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createActivity(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getActivities(req: Request, res: Response): Promise<void>;
    static getDashboardStats(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=crm.controller.d.ts.map