import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type {
  ApiResponse,
  AuthRequest,
  AuthResponse,
  ConnectionStatus,
  DeviceInfo,
  Metric,
} from '../types/api';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage
    this.token = localStorage.getItem('auth_token');
    if (this.token) {
      this.setAuthToken(this.token);
    }

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.clearAuth();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private setAuthToken(token: string): void {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('auth_token', token);
  }

  private clearAuth(): void {
    this.token = null;
    delete this.client.defaults.headers.common['Authorization'];
    localStorage.removeItem('auth_token');
  }

  public async login(credentials: AuthRequest): Promise<AuthResponse> {
    const response = await this.client.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      credentials
    );
    
    if (response.data.success && response.data.data) {
      this.setAuthToken(response.data.data.token);
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Login failed');
  }

  public logout(): void {
    this.clearAuth();
  }

  public isAuthenticated(): boolean {
    return this.token !== null;
  }

  public async getStatus(): Promise<ConnectionStatus> {
    const response = await this.client.get<ApiResponse<ConnectionStatus>>('/status');
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to get status');
  }

  public async getDevices(): Promise<DeviceInfo[]> {
    const response = await this.client.get<ApiResponse<DeviceInfo[]>>('/devices');
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to get devices');
  }

  public async getDeviceMetrics(deviceId: string): Promise<Metric[]> {
    const response = await this.client.get<ApiResponse<Metric[]>>(
      `/devices/${deviceId}/metrics`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to get device metrics');
  }

  public async getConfig(): Promise<unknown> {
    const response = await this.client.get<ApiResponse>('/config');
    
    if (response.data.success) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to get config');
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get<ApiResponse>('/health');
      return response.data.success;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
