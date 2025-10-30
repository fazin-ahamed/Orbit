import { Request, Response } from 'express';
export declare class AuthController {
    static login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static register(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static validate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static refreshToken(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static setupMFA(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static verifyMFA(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static disableMFA(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static logout(req: Request, res: Response): Promise<void>;
    static getProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=auth.controller.d.ts.map