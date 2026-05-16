import { Component, HostListener, inject } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
})
export class AdminShellComponent {
  private readonly location = inject(Location);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.location.back();
  }
}
