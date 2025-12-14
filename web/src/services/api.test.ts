import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { apiService } from './api';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('ApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('should store token on successful login', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            token: 'test-token',
            username: 'admin',
            expiresIn: 86400,
          },
        },
      };

      mockedAxios.create.mockReturnValue({
        post: vi.fn().mockResolvedValue(mockResponse),
        interceptors: {
          response: { use: vi.fn() },
        },
        defaults: { headers: { common: {} } },
      } as any);

      const result = await apiService.login({
        username: 'admin',
        password: 'admin123',
      });

      expect(result.token).toBe('test-token');
      expect(localStorage.getItem('auth_token')).toBe('test-token');
    });

    it('should throw error on failed login', async () => {
      const mockResponse = {
        data: {
          success: false,
          error: 'Invalid credentials',
        },
      };

      mockedAxios.create.mockReturnValue({
        post: vi.fn().mockResolvedValue(mockResponse),
        interceptors: {
          response: { use: vi.fn() },
        },
        defaults: { headers: { common: {} } },
      } as any);

      await expect(
        apiService.login({ username: 'wrong', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should clear token on logout', () => {
      localStorage.setItem('auth_token', 'test-token');
      apiService.logout();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('auth_token', 'test-token');
      // Create new instance to pick up token from localStorage
      expect(apiService.isAuthenticated()).toBe(true);
    });

    it('should return false when no token exists', () => {
      expect(apiService.isAuthenticated()).toBe(false);
    });
  });
});
