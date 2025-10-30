import { Request, Response } from 'express';
export declare class AuthController {
    static login(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static register(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static validate(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static refreshToken(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static setupMFA(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static verifyMFA(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static disableMFA(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static logout(req: Request, res: Response): Promise<void>;
    static getProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=auth.controller.d.ts.map