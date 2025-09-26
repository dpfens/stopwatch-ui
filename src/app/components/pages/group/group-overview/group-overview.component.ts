import { Component, inject} from '@angular/core';
import { GroupService } from '../../../../services/group/group.service';
import {MatSidenavModule} from '@angular/material/sidenav';

@Component({
  selector: 'group-overview',
  imports: [MatSidenavModule],
  templateUrl: './group-overview.component.html',
  styleUrl: './group-overview.component.scss'
})
export class GroupOverviewComponent {
  private service = inject(GroupService);
  
  instances = this.service.instances;
  loading = this.service.isLoading;
  error = this.service.error;
}