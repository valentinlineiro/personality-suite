import {
  Component,
  Input,
  OnChanges,
  AfterViewInit,
  ViewChild,
  ElementRef,
  NgZone,
  ChangeDetectionStrategy,
} from '@angular/core'
import * as d3 from 'd3'
import { PersonalityProfile } from '../../engine/profile-engine.service'
import { DIMENSIONS, getDimension } from '../../constants/dimensions'

@Component({
  selector: 'app-radar-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #chart class="w-full aspect-square"></div>`,
  styles: [`
    :host { display: block; }
  `],
})
export class RadarChartComponent implements AfterViewInit, OnChanges {
  @Input() profile: PersonalityProfile | null = null
  @ViewChild('chart') chartRef!: ElementRef<HTMLDivElement>
  private initialized = false

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    this.initialized = true
    if (this.profile) this.render()
  }

  ngOnChanges(): void {
    if (this.initialized) this.render()
  }

  private render(): void {
    this.ngZone.runOutsideAngular(() => {
      const el = this.chartRef.nativeElement
      d3.select(el).selectAll('svg').remove()

      const size = el.getBoundingClientRect().width || 300
      const margin = 48
      const cx = size / 2
      const cy = size / 2
      const radius = (size / 2) - margin

      const svg = d3.select(el)
        .append('svg')
        .attr('viewBox', `0 0 ${size} ${size}`)
        .attr('width', '100%')

      const n = DIMENSIONS.length
      const angleStep = (2 * Math.PI) / n

      const angle = (i: number) => angleStep * i - Math.PI / 2;

      // Grid circles
      const gridLevels: number[] = [0.25, 0.5, 0.75, 1]
      gridLevels.forEach((t: number) => {
        svg.append('circle')
          .attr('cx', cx).attr('cy', cy)
          .attr('r', radius * t)
          .attr('fill', 'none')
          .attr('stroke', '#1e293b')
          .attr('stroke-width', 1)
      })

      // Axes and labels
      DIMENSIONS.forEach((dim, i) => {
        const a = angle(i)
        const x2 = cx + radius * Math.cos(a)
        const y2 = cy + radius * Math.sin(a)
        const score = this.profile?.scores.find(s => s.dimensionId === dim.id)?.score

        svg.append('line')
          .attr('x1', cx).attr('y1', cy)
          .attr('x2', x2).attr('y2', y2)
          .attr('stroke', score == null ? '#334155' : '#475569')
          .attr('stroke-width', 1)
          .attr('opacity', score == null ? 0.3 : 1)

        const lx = cx + (radius + 20) * Math.cos(a)
        const ly = cy + (radius + 20) * Math.sin(a)

        svg.append('text')
          .attr('x', lx).attr('y', ly)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '11')
          .attr('fill', score == null ? '#475569' : dim.color)
          .attr('opacity', score == null ? 0.4 : 1)
          .text(dim.label)
      })

      if (!this.profile) return

      const dominantColor = this.profile.dominantDimension
        ? getDimension(this.profile.dominantDimension).color
        : '#3b82f6'

      // Data polygon
      const points = DIMENSIONS.map((dim, i) => {
        const score = this.profile!.scores.find(s => s.dimensionId === dim.id)?.score ?? 0
        const r = radius * (score / 100)
        const a = angle(i)
        return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number]
      })

      const line = d3.line().curve(d3.curveLinearClosed)
      svg.append('path')
        .datum(points)
        .attr('d', line)
        .attr('fill', dominantColor)
        .attr('fill-opacity', 0.15)
        .attr('stroke', dominantColor)
        .attr('stroke-width', 2)

      // Data points
      points.forEach(([x, y]) => {
        svg.append('circle')
          .attr('cx', x).attr('cy', y)
          .attr('r', 3)
          .attr('fill', dominantColor)
      })
    })
  }
}
