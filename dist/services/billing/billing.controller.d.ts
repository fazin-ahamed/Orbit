import { Request, Response } from 'express';
export declare class BillingController {
    static getSubscription(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createSubscription(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateSubscription(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static cancelSubscription(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getUsage(req: Request, res: Response): Promise<void>;
    static recordUsage(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getInvoices(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getProducts(req: Request, res: Response): Promise<void>;
    static createPaymentMethod(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=billing.controller.d.ts.map