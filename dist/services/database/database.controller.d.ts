import { Request, Response } from 'express';
export declare class DatabaseController {
    static healthCheck(req: Request, res: Response): Promise<void>;
    static getStats(req: Request, res: Response): Promise<void>;
    static testConnection(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=database.controller.d.ts.map