import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { InfographicViewerComponent } from './infographic-viewer.component';

const buildActivatedRouteStub = (slug: string) => ({
  snapshot: { paramMap: convertToParamMap({ slug }) }
});

// Checks loading by slug, missing-slug redirect, and back navigation wiring.
describe('InfographicViewerComponent', () => {
  const createComponent = async (slug: string) => {
    const router = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);

    await TestBed.configureTestingModule({
      imports: [InfographicViewerComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: buildActivatedRouteStub(slug) }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(InfographicViewerComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { fixture, component, router };
  };

  it('loads the infographic by slug', async () => {
    const { component, router } = await createComponent('five-tips-hair-dye');

    expect(component['infographic']).toBeTruthy();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('navigates home when slug does not exist', async () => {
    const { component, router } = await createComponent('missing');

    component.ngOnInit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('navigates back with fragment when handleBack is called', async () => {
    const { component, router } = await createComponent('five-tips-hair-dye');

    component['handleBack']('five-tips-hair-dye');
    expect(router.navigate).toHaveBeenCalledWith(['/'], { fragment: 'infographic-five-tips-hair-dye' });
  });
});
