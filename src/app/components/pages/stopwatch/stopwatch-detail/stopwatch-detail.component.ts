import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';

@Component({
  selector: 'stopwatch-detail',
  imports: [],
  templateUrl: './stopwatch-detail.component.html',
  styleUrl: './stopwatch-detail.component.scss'
})
export class StopwatchDetailComponent {
  private route = inject(ActivatedRoute);
  private service = inject(StopwatchService);
  
  // Create a signal from the route params observable
  id = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('id'))
    ),
    { initialValue: null }
  );
  loading = this.service.isLoading;
  error = this.service.error;
}
