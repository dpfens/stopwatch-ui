import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { GroupService } from '../../../../services/group/group.service';
import { HeaderActionService } from '../../../../services/action/header-action.service';
import { GLOBAL } from '../../../../utilities/constants';
import { GroupListViewComponent } from '../../../shared/group/views/list/group-list/group-list.component';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'group-list',
  imports: [GroupListViewComponent, RouterOutlet],
  templateUrl: './group-list.component.html',
  styleUrl: './group-list.component.scss'
})
export class GroupListComponent implements OnInit, OnDestroy {
  private service = inject(GroupService);
  public readonly headerActionService = inject(HeaderActionService);
  
  instances = this.service.instances;
  loading = this.service.isLoading;
  error = this.service.error;

  ngOnInit(): void {
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
