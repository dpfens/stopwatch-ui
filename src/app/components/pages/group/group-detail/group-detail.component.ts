import { Component, effect, inject, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { StopwatchRepository } from '../../../../repositories/stopwatch';
import { GroupRepository } from '../../../../repositories/group';
import { StopwatchGroup, UniqueIdentifier } from '../../../../models/sequence/interfaces';

@Component({
  selector: 'group-detail',
  imports: [],
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.scss'
})
export class GroupDetailComponent {
  private route = inject(ActivatedRoute);
  private readonly stopwatchRepository: StopwatchRepository = new StopwatchRepository();
  private readonly repository: GroupRepository = new GroupRepository();
    
  id = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('id'))
    ),
    { initialValue: null }
  );
  loading = signal(true);
  error = signal<Error | null>(null);
  instance: WritableSignal<StopwatchGroup | undefined> = signal(undefined);

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
      const baseGroup = await this.repository.get(id);
      if (!baseGroup) {
        return;
      }
      this.instance.set({
        ...baseGroup,
        members: await this.stopwatchRepository.byGroup(id)
      });
    } catch(e) {
      this.error.set(e as Error);
    } finally {
      this.loading.set(false);
    }
  }
}
