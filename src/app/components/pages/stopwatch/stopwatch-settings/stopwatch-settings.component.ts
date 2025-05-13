import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-stopwatch-settings',
  imports: [],
  templateUrl: './stopwatch-settings.component.html',
  styleUrl: './stopwatch-settings.component.scss'
})
export class StopwatchSettingsComponent {
  private route = inject(ActivatedRoute);
    
  id = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('id'))
    ),
    { initialValue: null }
  );
}
