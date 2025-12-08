import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { buildYoutubeThumbnailUrl } from '../../resources/youtube-videos';

@Component({
  selector: 'app-youtube-video',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './youtube-video.component.html',
  styleUrl: './youtube-video.component.scss'
})
export class YoutubeVideoComponent implements OnChanges {
  @Input({ required: true }) slug!: string;
  @Input({ required: true }) videoUrl!: string;
  @Input() title?: string;
  @Input() description?: string;
  @Input() active = false;
  @Output() select = new EventEmitter<void>();

  protected thumbnailUrl?: string;

  ngOnChanges(changes: SimpleChanges): void {
    if ('videoUrl' in changes && this.videoUrl) {
      this.thumbnailUrl = buildYoutubeThumbnailUrl(this.videoUrl);
    }
  }
}
