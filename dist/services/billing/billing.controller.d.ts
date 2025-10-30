import { Request, Response } from 'express';
export declare class BillingController {
    static getSubscription(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createSubscription(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateSubscription(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static cancelSubscription(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getUsage(req: Request, res: Response): Promise<void>;
    static recordUsage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getInvoices(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getProducts(req: Request, res: Response): Promise<void>;
    static createPaymentMethod(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=billing.controller.d.ts.map