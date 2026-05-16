import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { AdminShellComponent } from './admin-shell.component';

describe('AdminShellComponent', () => {
  let fixture: ComponentFixture<AdminShellComponent>;
  let locationSpy: jasmine.SpyObj<Location>;

  beforeEach(async () => {
    locationSpy = jasmine.createSpyObj('Location', ['back']);

    await TestBed.configureTestingModule({
      imports: [AdminShellComponent, RouterTestingModule],
      providers: [{ provide: Location, useValue: locationSpy }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();
  });

  it('renders without error', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('calls location.back() when Escape is pressed', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(locationSpy.back).toHaveBeenCalledTimes(1);
  });

  it('does not call location.back() for other keys', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(locationSpy.back).not.toHaveBeenCalled();
  });
});
