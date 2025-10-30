import { Request, Response } from 'express';
export declare class AIController {
    static getProviders(req: Request, res: Response): Promise<void>;
    static configureProvider(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createChatCompletion(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createEmbedding(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getUsage(req: Request, res: Response): Promise<void>;
    static testConnection(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=ai.controller.d.ts.map