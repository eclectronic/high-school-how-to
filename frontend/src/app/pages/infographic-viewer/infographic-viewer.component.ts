import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InfographicResource, infographics } from '../../resources/infographics';

@Component({
  selector: 'app-infographic-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './infographic-viewer.component.html',
  styleUrl: './infographic-viewer.component.scss'
})
export class InfographicViewerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected infographic?: InfographicResource;

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    this.infographic = infographics.find((item) => item.slug === slug);

    if (!this.infographic) {
      void this.router.navigateByUrl('/');
    }
  }

  protected handleBack(slug: string): void {
    void this.router.navigate(['/'], { fragment: `infographic-${slug}` });
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected handleEscape(event: Event): void {
    event.preventDefault();
    const slug = this.infographic?.slug;
    if (slug) {
      this.handleBack(slug);
    }
  }
}
