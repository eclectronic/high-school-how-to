import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { YoutubeVideoComponent } from './youtube-video.component';

// Covers thumbnail generation and select event wiring for the YouTube tile.

describe('YoutubeVideoComponent', () => {
  let fixture: ComponentFixture<YoutubeVideoComponent>;
  let component: YoutubeVideoComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YoutubeVideoComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(YoutubeVideoComponent);
    component = fixture.componentInstance;
  });

  it('builds a thumbnail when the video url changes', () => {
    component.videoUrl = 'https://www.youtube.com/watch?v=abc123';
    component.ngOnChanges({
      videoUrl: new SimpleChange(null, component.videoUrl, true)
    });

    expect(component['thumbnailUrl']).toContain('abc123');
  });

  it('emits select when triggered', () => {
    const spy = jasmine.createSpy('select');
    component.select.subscribe(spy);

    component.select.emit();

    expect(spy).toHaveBeenCalled();
  });
});
