import { Request, Response } from 'express';
export declare class VectorController {
    static createVector(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static searchVectors(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getVectorStats(req: Request, res: Response): Promise<void>;
    static deleteVectorsBySource(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=vector.controller.d.ts.map