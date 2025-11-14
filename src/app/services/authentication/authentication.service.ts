// src/app/core/services/authentication.service.ts
import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthStatus } from '../../models/auth';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  // Signal-based state management
  private authStatusSignal = signal<AuthStatus>({ authenticated: false });
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Public read-only signals
  readonly authStatus = this.authStatusSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // Computed signals
  readonly isAuthenticated = computed(() => this.authStatus().authenticated);
  readonly currentUser = computed(() => this.authStatus().user);

  private readonly API_URL = environment.apiUrl;

  constructor() {
    // Check auth status on service initialization
    if (isPlatformBrowser(this.platformId)) {
      this.checkAuthStatus();
    }
  }

  /**
   * Redirect user to Google OAuth login on backend
   */
  loginWithGoogle(): void {
    // Clear any previous errors
    this.errorSignal.set(null);
    
    // Redirect to backend OAuth endpoint
    window.location.href = `${this.API_URL}/login/federated/google`;
  }

  /**
   * Check current authentication status
   * Called on app initialization and after OAuth callback
   */
  async checkAuthStatus(): Promise<AuthStatus> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const status = await firstValueFrom(
        this.http.get<AuthStatus>(`${this.API_URL}/auth/status`, {
          withCredentials: true
        })
      );

      this.authStatusSignal.set(status);
      this.loadingSignal.set(false);
      return status;

    } catch (error) {
      console.error('Auth status check failed:', error);
      this.errorSignal.set('Failed to check authentication status');
      this.authStatusSignal.set({ authenticated: false });
      this.loadingSignal.set(false);
      return { authenticated: false };
    }
  }

  /**
   * Log out the current user
   */
  async logout(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      await firstValueFrom(
        this.http.post(`${this.API_URL}/auth/logout`, {}, {
          withCredentials: true
        })
      );

      // Clear auth state
      this.authStatusSignal.set({ authenticated: false });
      this.loadingSignal.set(false);

      // Redirect to login page
      this.router.navigate(['/login']);

    } catch (error) {
      console.error('Logout failed:', error);
      this.errorSignal.set('Logout failed');
      this.loadingSignal.set(false);
      throw error;
    }
  }

  /**
   * Make an authenticated API request
   * Automatically includes credentials
   */
  authenticatedRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Observable<T> {
    const url = `${this.API_URL}${endpoint}`;
    const options = { 
      withCredentials: true,
      body: method !== 'GET' ? body : undefined
    };

    return this.http.request<T>(method, url, options).pipe(
      catchError((error) => {
        // If we get a 401, user session may have expired
        if (error.status === 401) {
          this.authStatusSignal.set({ authenticated: false });
          this.router.navigate(['/login']);
        }
        throw error;
      })
    );
  }

  /**
   * Convenience methods for HTTP requests
   */
  get<T>(endpoint: string): Observable<T> {
    return this.authenticatedRequest<T>('GET', endpoint);
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.authenticatedRequest<T>('POST', endpoint, body);
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.authenticatedRequest<T>('PUT', endpoint, body);
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.authenticatedRequest<T>('DELETE', endpoint);
  }
}