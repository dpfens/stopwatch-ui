import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthenticationService } from '../../../services/authentication/authentication.service';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p class="mt-4 text-gray-600">Completing login...</p>
      </div>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  private authService = inject(AuthenticationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private readonly PLATFORM_ID = inject(PLATFORM_ID);

  async ngOnInit() {
      // Check authentication status after OAuth redirect
      if (isPlatformBrowser(this.PLATFORM_ID)) {
        try {
          const authStatus = await this.authService.checkAuthStatus();
          if (authStatus.authenticated) {
            // Get return URL from query params or default to dashboard
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
            this.router.navigate([returnUrl]);
          } else {
            // Authentication failed, redirect to login
            this.router.navigate(['/'], {
              queryParams: { error: 'Authentication failed' }
            });
          }
        } catch (error) {
          console.error('Auth callback error:', error);
          this.router.navigate(['/'], {
            queryParams: { error: 'An error occurred during login' }
          });
        } 
      }
  }
}