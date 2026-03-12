import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      res.status(400).json({
        error: 'Validation Error',
        message: error.details.map(d => d.message).join(', '),
        timestamp: new Date().toISOString()
      });
      return;
    }
    req.body = value;
    next();
  };
};
