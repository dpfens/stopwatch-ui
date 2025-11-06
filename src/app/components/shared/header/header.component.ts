import { Component, inject} from '@angular/core';
import {FormBuilder, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HeaderActionService } from '../../../services/action/header-action.service';
import { GLOBAL } from '../../../utilities/constants';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink, RouterLinkActive,
    MatToolbarModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatAutocompleteModule,
    FormsModule, ReactiveFormsModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private formBuilder = inject(FormBuilder);
  public readonly headerActionService = inject(HeaderActionService);

  searchForm = this.formBuilder.group({
    query: '',
  })

  hasMenu(): boolean {
    return this.headerActionService.has(GLOBAL.SIDENAV_TOGGLE);
  }

  executeMenuToggle() {
    this.headerActionService.execute(GLOBAL.SIDENAV_TOGGLE);
  }

  hasCreate(): boolean {
    return this.headerActionService.has(GLOBAL.CREATE);
  }

  async createNew(): Promise<void> {
    this.headerActionService.execute(GLOBAL.CREATE);
  }

  hasShare(): boolean {
    return ('share' in navigator) && ('canShare' in navigator) && (navigator.canShare());
  }

  executeShare() {
    navigator.share({
      title: "Multi-Stopwatch",
      text: "A stopwatch that actually handles multiple timers. Runs in your browser, keeps your data local and works offline.",
      url: location.href
    });
  }

  hasSearch(): boolean {
    return this.headerActionService.has(GLOBAL.SEARCH);
  }

  async executeSearch(): Promise<void> {

  } 
}
