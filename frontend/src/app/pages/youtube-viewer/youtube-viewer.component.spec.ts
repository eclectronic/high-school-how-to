import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SecurityContext } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { YoutubeViewerComponent } from './youtube-viewer.component';

const buildRouteStub = (slug: string) => ({
  snapshot: { paramMap: convertToParamMap({ slug }) }
});

// Ensures video lookup, safe embed construction, redirect on missing slug, and back link behavior.
describe('YoutubeViewerComponent', () => {
  const createComponent = async (slug: string) => {
    await TestBed.configureTestingModule({
      imports: [YoutubeViewerComponent, RouterTestingModule],
      providers: [{ provide: ActivatedRoute, useValue: buildRouteStub(slug) }]
    }).compileComponents();

    const fixture = TestBed.createComponent(YoutubeViewerComponent);
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.stub();
    spyOn(router, 'navigateByUrl').and.stub();
    const sanitizer = TestBed.inject(DomSanitizer);
    fixture.detectChanges();
    return { component, router, sanitizer };
  };

  it('loads the video and builds embed url', async () => {
    const { component, sanitizer, router } = await createComponent('ultimate-gpa-calculation-guide');

    expect(component['video']).toBeTruthy();
    const sanitized = sanitizer.sanitize(
      SecurityContext.RESOURCE_URL,
      component['embedUrl'] as any
    );
    expect(sanitized).toBeTruthy();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('navigates home when video slug is missing', async () => {
    const { component, router } = await createComponent('missing');

    component.ngOnInit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('navigates back with fragment', async () => {
    const { component, router } = await createComponent('ultimate-gpa-calculation-guide');

    component['handleBack']('ultimate-gpa-calculation-guide');
    expect(router.navigate).toHaveBeenCalledWith(['/'], { fragment: 'video-ultimate-gpa-calculation-guide' });
  });
});
