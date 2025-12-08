import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-infographic-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './infographic-card.component.html',
  styleUrl: './infographic-card.component.scss'
})
export class InfographicCardComponent {
  @Input({ required: true }) slug!: string;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) image!: string;
  @Input() description?: string;
  @Input() active = false;
  @Output() select = new EventEmitter<void>();
}
