import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent],
  template: `
    <div class="min-h-screen bg-slate-900 pb-24">
      <router-outlet />
    </div>
    <app-bottom-nav />
  `,
})
export class App {}
