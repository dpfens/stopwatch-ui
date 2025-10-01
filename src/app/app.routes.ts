import { Routes } from '@angular/router';
import { HomeComponent } from './components/pages/home/home.component';
import { SettingsComponent } from './components/pages/settings/settings.component';
import { StopwatchListComponent } from './components/pages/stopwatch/stopwatch-list/stopwatch-list.component';
import { GroupListComponent } from './components/pages/group/group-list/group-list.component';
import { GroupDetailComponent } from './components/pages/group/group-detail/group-detail.component';
import { AboutComponent } from './components/pages/about/about.component';
import { GroupOverviewComponent } from './components/pages/group/group-overview/group-overview.component';
import { NotFoundComponent } from './components/pages/not-found/not-found.component';

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
    path: 'group', 
    title: 'Groups',
    component: GroupListComponent,
    children: [
      {
        path: '',
        title: 'Groups',
        component: GroupOverviewComponent,
      },
      {
        path: ':id',
        title: 'Group',
        component: GroupDetailComponent,
      }
    ]
  },
  { 
    path: 'settings', 
    title: 'Settings',
    component: SettingsComponent
  },
  { 
    path: 'about', 
    title: 'About',
    component: AboutComponent
  },
  {
    path: '**',
    title: 'Page Not Found',
    component: NotFoundComponent
  }
];
