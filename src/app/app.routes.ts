import { Routes } from '@angular/router';
import { HomeComponent } from './components/pages/home/home.component';
import { SettingsComponent } from './components/pages/settings/settings.component';
import { StopwatchListComponent } from './components/pages/stopwatch/stopwatch-list/stopwatch-list.component';
import { StopwatchDetailComponent } from './components/pages/stopwatch/stopwatch-detail/stopwatch-detail.component';
import { GroupListComponent } from './components/pages/group/group-list/group-list.component';
import { GroupDetailComponent } from './components/pages/group/group-detail/group-detail.component';
import { StopwatchSettingsComponent } from './components/pages/stopwatch/stopwatch-settings/stopwatch-settings.component';
import { GroupSettingsComponent } from './components/pages/group/group-settings/group-settings.component';

export const routes: Routes = [
  { 
    path: '',
    title: 'Home',
    component: HomeComponent
  },
  { 
    path: 'stopwatch', 
    title: 'Stopwatches',
    component: StopwatchListComponent,
  },
  {
    path: 'stopwatch/:id',
    title: 'Stopwatch',
    component: StopwatchDetailComponent,
    children: [
      {
        path: 'settings',
        title: 'Settings',
        component: StopwatchSettingsComponent
      }
    ],
  },
  { 
    path: 'group', 
    title: 'Groups',
    component: GroupListComponent,
  },
  {
    path: 'group/:id',
    title: 'Group',
    component: GroupDetailComponent,
    children: [
      {
        path: 'settings',
        title: 'Settings',
        component: GroupSettingsComponent
      }
    ],
  },
  { 
    path: 'settings', 
    title: 'Settings',
    component: SettingsComponent
  }
];
