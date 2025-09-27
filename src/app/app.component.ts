import {Component, computed, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import { HeaderComponent } from './components/shared/header/header.component';
import { SettingsService } from './services/settings/settings.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Stopwatch';
  settings = inject(SettingsService);

  theme = computed(() => this.settings.getEffectiveValue('theme'));
}
