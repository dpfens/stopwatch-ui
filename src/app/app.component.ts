import {Component, DOCUMENT, effect, inject, PLATFORM_ID, Renderer2} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import { HeaderComponent } from './components/shared/header/header.component';
import { SettingsService } from './services/settings/settings.service';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Stopwatch';
  private readonly platformId = inject(PLATFORM_ID)
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private readonly settings = inject(SettingsService);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const theme = this.settings.getEffectiveValue('theme');
        this.renderer.setStyle(this.document.body, 'color-scheme', theme);
      });
    }
  }
}
