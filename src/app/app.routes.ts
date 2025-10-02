import { Routes } from '@angular/router';
import { HomeComponent } from './components/pages/home/home.component';
import { SettingsComponent } from './components/pages/settings/settings.component';
import { StopwatchListComponent } from './components/pages/stopwatch/stopwatch-list/stopwatch-list.component';
import { GroupListComponent } from './components/pages/group/group-list/group-list.component';
import { GroupDetailComponent } from './components/pages/group/group-detail/group-detail.component';
import { AboutComponent } from './components/pages/about/about.component';
import { GroupOverviewComponent } from './components/pages/group/group-overview/group-overview.component';
import { NotFoundComponent } from './components/pages/not-found/not-found.component';

const appName = 'Epochron';

export const routes: Routes = [
  { 
    path: '',
    title: `Home - ${appName}`,
    component: HomeComponent
  },
  { 
    path: 'stopwatch', 
    title: `Stopwatches - ${appName}`,
    component: StopwatchListComponent,
  },
  { 
    path: 'group', 
    title: `Groups - ${appName}`,
    component: GroupListComponent,
    children: [
      {
        path: '',
        title: `Groups - ${appName}`,
        component: GroupOverviewComponent,
      },
      {
        path: ':id',
        title: `Group - ${appName}`,
        component: GroupDetailComponent,
      }
    ]
  },
  { 
    path: 'settings', 
    title: `Settings - ${appName}`,
    component: SettingsComponent
  },
  { 
    path: 'about', 
    title: `About - ${appName}`,
    component: AboutComponent
  },
  {
    path: '**',
    title: `Page Not Found - ${appName}`,
    component: NotFoundComponent
  }
];
