import { NextFunction, Request, Response } from "express";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  if (err instanceof Error) {
    res.status(500).json({
      message: err.message
    });
    return;
  }

  res.status(500).json({
    message: 'Unexpected error'
  });
};
