import { Component, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { GroupService } from '../../../../services/group/group.service';
import { HeaderActionService } from '../../../../services/action/header-action.service';
import { GLOBAL } from '../../../../utilities/constants';
import { GroupListViewComponent } from '../../../shared/group/views/list/group-list/group-list.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'group-list',
  imports: [GroupListViewComponent, RouterOutlet],
  templateUrl: './group-list.component.html',
  styleUrl: './group-list.component.scss'
})
export class GroupListComponent implements OnDestroy {
  private service = inject(GroupService);
  private router = inject(Router);
  public readonly headerActionService = inject(HeaderActionService);
  
  instances = this.service.instances;
  loading = this.service.isLoading;
  error = this.service.error;

  // Signal that tracks current URL and determines if we're on list or detail
  private isOnListView = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(event => {
        const url = (event as NavigationEnd).url;
        // We're on list view if URL is exactly '/group' (not '/group/123')
        return url === '/group';
      })
    ),
    { initialValue: this.router.url === '/group' }
  );

  constructor() {
    // Effect to manage header actions based on current route
    effect(() => {
      const onListView = this.isOnListView();
      
      if (onListView) {
        // We're on the list view, set the list action
        this.headerActionService.set(GLOBAL.CREATE, this.createNew.bind(this));
      } else {
        // We're on a child route, clear our action so child can set theirs
        if (this.headerActionService.has(GLOBAL.CREATE)) {
          this.headerActionService.delete(GLOBAL.CREATE);
        }
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // Initial setup if needed
    this.headerActionService.set(GLOBAL.CREATE, this.createNew.bind(this));
  }

  async createNew(): Promise<void> {
    const instance = this.service.blank('', '');
    await this.service.create(instance);
  }

  ngOnDestroy() {
    if (this.headerActionService.has(GLOBAL.CREATE)) {
      this.headerActionService.delete(GLOBAL.CREATE);
    }
  }
}