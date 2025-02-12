import rateLimit from 'express-rate-limit';
import { APIError } from './errorHandler';

// Create a limiter for general API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  handler: (req, res) => {
    throw new APIError(429, 'Too many requests from this IP, please try again later', 'RATE_LIMIT_EXCEEDED');
  },
});

// Create a stricter limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 failed requests per windowMs
  message: 'Too many failed login attempts, please try again later',
  handler: (req, res) => {
    throw new APIError(429, 'Too many failed login attempts, please try again later', 'AUTH_RATE_LIMIT_EXCEEDED');
  },
});

// Create a limiter for file uploads
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 file uploads per windowMs
  message: 'Too many file uploads from this IP, please try again later',
  handler: (req, res) => {
    throw new APIError(429, 'Too many file uploads from this IP, please try again later', 'UPLOAD_RATE_LIMIT_EXCEEDED');
  },
}); 