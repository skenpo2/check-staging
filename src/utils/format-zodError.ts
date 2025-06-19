import { Response } from 'express';
import { z } from 'zod';
import { HTTPSTATUS } from '../configs/http.config';
import { ErrorCodeEnum } from '../enums/error-code.enum';

const formatZodError = (res: Response, error: z.ZodError) => {
  const errors = error?.issues?.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
  return res.status(HTTPSTATUS.BAD_REQUEST).json({
    message: 'Validation failed',
    errors: errors,
    errorCode: ErrorCodeEnum.VALIDATION_ERROR,
  });
};

export default formatZodError;
