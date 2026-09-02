import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RestaurantListComponent } from './restaurants/restaurant-list/restaurant-list.component';
import { RestaurantDetailComponent } from './restaurants/restaurant-detail/restaurant-detail.component';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'admin/dashboard' },
  { path: 'login', component: LoginComponent },
  {
    path: 'admin',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'restaurants', component: RestaurantListComponent },
      { path: 'restaurants/:id', component: RestaurantDetailComponent },
    ],
  },
  { path: '**', redirectTo: 'admin/dashboard' },
];
