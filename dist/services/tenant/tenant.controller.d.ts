import { Request, Response } from 'express';
export declare class TenantController {
    static create(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getAll(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static update(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static delete(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=tenant.controller.d.ts.map