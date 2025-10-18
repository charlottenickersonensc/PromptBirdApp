import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error('[api:error]', err);
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Unexpected error' });
};
