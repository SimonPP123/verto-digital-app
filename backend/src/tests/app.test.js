const request = require('supertest');
const app = require('../app');

describe('App', () => {
  describe('GET /health', () => {
    it('should return 200 OK with status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('Authentication', () => {
    it('should redirect to Google OAuth when accessing /auth/google', async () => {
      const response = await request(app).get('/auth/google');
      expect(response.status).toBe(302); // Redirect status code
      expect(response.header.location).toContain('accounts.google.com');
    });

    it('should return unauthorized for protected routes when not authenticated', async () => {
      const response = await request(app).get('/api/protected');
      expect(response.status).toBe(401);
    });
  });
}); 