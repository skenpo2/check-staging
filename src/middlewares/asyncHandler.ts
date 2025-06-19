import { NextFunction, Request, Response } from 'express';

type AsyncControllerType = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

const AsyncHandler =
  (fn: AsyncControllerType): AsyncControllerType =>
  async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };

export default AsyncHandler;
