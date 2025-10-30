import { Request, Response } from 'express';
export declare class ProjectsController {
    static createProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getProjects(req: Request, res: Response): Promise<void>;
    static updateProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createTask(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getTasks(req: Request, res: Response): Promise<void>;
    static updateTask(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getDashboardStats(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=projects.controller.d.ts.map