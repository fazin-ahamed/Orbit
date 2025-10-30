import { Request, Response } from 'express';
export declare class AIController {
    static getProviders(req: Request, res: Response): Promise<void>;
    static configureProvider(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createChatCompletion(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createEmbedding(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getUsage(req: Request, res: Response): Promise<void>;
    static testConnection(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=ai.controller.d.ts.map