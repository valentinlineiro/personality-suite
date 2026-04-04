import { Component, inject } from '@angular/core'
import { RouterOutlet, Router, NavigationEnd } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { filter, map } from 'rxjs'
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent],
  template: `
    <div class="min-h-screen bg-slate-900" [class.pb-24]="showNav()">
      <router-outlet />
    </div>
    @if (showNav()) {
      <app-bottom-nav />
    }
  `,
})
export class App {
  private router = inject(Router)

  showNav = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => !this.router.url.startsWith('/login')),
    ),
    { initialValue: !window.location.pathname.startsWith('/login') },
  )
}
