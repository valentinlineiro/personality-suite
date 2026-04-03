import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent],
  template: `
    <router-outlet />
    <app-bottom-nav />
  `,
})
export class App {}
