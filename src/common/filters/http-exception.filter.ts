import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent: any = exception.getResponse();
      message = typeof resContent === 'string' ? resContent : resContent.message || exception.message;
      if (Array.isArray(resContent.message)) {
        errors = resContent.message;
        message = 'Validation Failed';
      } else {
        errors = resContent.errors || [message];
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errors = [message];
    }

    response.status(status).json({
      success: false,
      message,
      errors,
    });
  }
}
