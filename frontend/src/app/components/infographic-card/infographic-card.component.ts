import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-infographic-card',
  standalone: true,
  imports: [CommonModule],
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
