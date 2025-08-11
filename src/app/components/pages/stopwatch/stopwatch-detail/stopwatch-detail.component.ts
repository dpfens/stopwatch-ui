import { Component, effect, inject, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { StopwatchRepository } from '../../../../repositories/stopwatch';
import { GroupRepository } from '../../../../repositories/group';
import { ContextualStopwatchEntity, UniqueIdentifier } from '../../../../models/sequence/interfaces';
import { AnalysisRegistry } from '../../../../models/sequence/analysis/registry';

@Component({
  selector: 'stopwatch-detail',
  imports: [],
  templateUrl: './stopwatch-detail.component.html',
  styleUrl: './stopwatch-detail.component.scss'
})
export class StopwatchDetailComponent {
  private route = inject(ActivatedRoute);
  private readonly repository: StopwatchRepository = new StopwatchRepository();
  private readonly groupRepository: GroupRepository = new GroupRepository();
  
  // Create a signal from the route params observable
  id = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('id'))
    ),
    { initialValue: null }
  );
  instance: WritableSignal<ContextualStopwatchEntity | undefined> = signal(undefined);
  loading = signal(true);
  error = signal<Error | null>(null);

  __after_id__ = effect(() => {
    const currentId = this.id();
    if (currentId) {
      this.get(currentId)
    }
  });
  
  async get(id: UniqueIdentifier): Promise<void> {    
    this.loading.set(true);
    this.error.set(null);
    try {
      const [baseStopwatch, groupIds] = await Promise.all([
        this.repository.get(id),
        this.groupRepository.byStopwatch(id)
      ]);
      if (!baseStopwatch) {
        return;
      }
      this.instance.set({
        ...baseStopwatch,
        groups: await this.groupRepository.getByIds(groupIds),
        analysis: new AnalysisRegistry()
      });
    } catch(e) {
      this.error.set(e as Error);
    } finally {
      this.loading.set(false);
    }
  }
}
