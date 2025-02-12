import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';
import { APIError } from './errorHandler';

// Extend Request type to include csrfToken method
declare global {
  namespace Express {
    interface Request {
      csrfToken(): string;
    }
  }
}

// Configure CSRF protection
const csrfProtection = csrf({
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: true,
  },
});

// Error handler for CSRF token validation
export const handleCSRF = (req: Request, res: Response, next: NextFunction) => {
  csrfProtection(req, res, (err: any) => {
    if (err) {
      if (err.code === 'EBADCSRFTOKEN') {
        throw new APIError(403, 'Invalid CSRF token', 'INVALID_CSRF_TOKEN');
      }
      next(err);
    } else {
      next();
    }
  });
};

// Middleware to set CSRF token cookie
export const setCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  res.cookie('XSRF-TOKEN', req.csrfToken(), {
    secure: process.env.NODE_ENV === 'production',
    sameSite: true,
  });
  next();
}; 