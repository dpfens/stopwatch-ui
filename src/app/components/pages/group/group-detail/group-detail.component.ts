import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { FullGroupDetailComponent } from "../../../shared/group/views/full/full.component";
import { GroupService } from '../../../../services/group/group.service';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';
import { HeaderActionService } from '../../../../services/action/header-action.service';
import { GLOBAL } from '../../../../utilities/constants';

@Component({
  selector: 'group-detail',
  imports: [FullGroupDetailComponent],
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.scss'
})
export class GroupDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  service = inject(GroupService);
  stopwatchService = inject(StopwatchService);
  headerActionService = inject(HeaderActionService);
    
  id = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('id'))
    ),
    { initialValue: null }
  );
  loading = this.service.isLoading;
  error = this.service.error;

  ngOnInit(): void {
      this.headerActionService.set(GLOBAL.CREATE, this.createNew.bind(this));
    }
  
  async createNew(): Promise<void> {
    const instance = this.stopwatchService.blank('', '');
    await this.stopwatchService.create(instance);
    const groupId = this.id();
    if (groupId) {
      await this.service.addMember(groupId, instance.id);
    }
  }
}
