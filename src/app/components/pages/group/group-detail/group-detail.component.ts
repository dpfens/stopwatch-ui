import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { FullGroupDetailComponent } from "../../../shared/group/views/full/full.component";
import { GroupService } from '../../../../services/group/group.service';

@Component({
  selector: 'group-detail',
  imports: [FullGroupDetailComponent],
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.scss'
})
export class GroupDetailComponent {
  private route = inject(ActivatedRoute);
  service = inject(GroupService);
    
  id = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('id'))
    ),
    { initialValue: null }
  );
  loading = this.service.isLoading;
  error = this.service.error;
}
