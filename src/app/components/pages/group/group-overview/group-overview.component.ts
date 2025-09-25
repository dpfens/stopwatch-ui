import { Component, inject} from '@angular/core';
import { GroupService } from '../../../../services/group/group.service';
import { GroupListViewComponent } from '../../../shared/group/views/list/group-list/group-list.component';
import { RouterOutlet } from '@angular/router';
import {MatSidenavModule} from '@angular/material/sidenav';

@Component({
  selector: 'group-overview',
  imports: [MatSidenavModule, GroupListViewComponent, RouterOutlet],
  templateUrl: './group-overview.component.html',
  styleUrl: './group-overview.component.scss'
})
export class GroupOverviewComponent {
  private service = inject(GroupService);
  
  instances = this.service.instances;
  loading = this.service.isLoading;
  error = this.service.error;
}