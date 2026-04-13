import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { ContentApiService } from '../../core/services/content-api.service';

@Component({
  selector: 'app-tiptap-editor',
  standalone: true,
  templateUrl: './tiptap-editor.component.html',
  styleUrl: './tiptap-editor.component.scss',
})
export class TiptapEditorComponent implements OnInit, OnDestroy {
  @ViewChild('editorEl', { static: true }) editorEl!: ElementRef<HTMLDivElement>;
  @ViewChild('imageFileInput') imageFileInput!: ElementRef<HTMLInputElement>;
  @Input() initialJson: string | null = null;
  @Input() initialHtml: string | null = null;
  @Input() backgroundColor: string | null = null;
  @Input() textColor: string | null = null;
  @Output() contentChange = new EventEmitter<{ json: string; html: string }>();

  protected uploadingImage = signal(false);

  private editor!: Editor;
  private readonly api = inject(ContentApiService);

  ngOnInit() {
    let content: object | string | undefined;
    if (this.initialJson) {
      try {
        content = JSON.parse(this.initialJson);
      } catch {
        content = undefined;
      }
    }
    // Fall back to HTML for cards seeded without bodyJson (e.g. Liquibase-seeded articles)
    if (!content && this.initialHtml) {
      content = this.initialHtml;
    }

    this.editor = new Editor({
      element: this.editorEl.nativeElement,
      extensions: [
        StarterKit,
        Image,
        Link.configure({ openOnClick: false }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Underline,
      ],
      content,
      onUpdate: ({ editor }) => {
        this.contentChange.emit({
          json: JSON.stringify(editor.getJSON()),
          html: editor.getHTML(),
        });
      },
    });
  }

  ngOnDestroy() {
    this.editor?.destroy();
  }

  isActive(name: string, attrs?: Record<string, unknown>) {
    return this.editor?.isActive(name, attrs) ?? false;
  }

  toggleBold() { this.editor.chain().focus().toggleBold().run(); }
  toggleItalic() { this.editor.chain().focus().toggleItalic().run(); }
  toggleUnderline() { this.editor.chain().focus().toggleUnderline().run(); }
  toggleStrike() { this.editor.chain().focus().toggleStrike().run(); }
  toggleBulletList() { this.editor.chain().focus().toggleBulletList().run(); }
  toggleOrderedList() { this.editor.chain().focus().toggleOrderedList().run(); }
  toggleBlockquote() { this.editor.chain().focus().toggleBlockquote().run(); }

  setHeading(level: 1 | 2 | 3) {
    this.editor.chain().focus().toggleHeading({ level }).run();
  }

  setAlign(alignment: 'left' | 'center' | 'right') {
    this.editor.chain().focus().setTextAlign(alignment).run();
  }

  insertImage(url: string) {
    this.editor.chain().focus().setImage({ src: url }).run();
  }

  setLink(url: string) {
    this.editor.chain().focus().setLink({ href: url }).run();
  }

  unsetLink() {
    this.editor.chain().focus().unsetLink().run();
  }

  triggerImageUpload() {
    this.imageFileInput?.nativeElement.click();
  }

  onImageFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadFile(file);
    input.value = '';
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;
    event.preventDefault();
    this.uploadFile(file);
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  private uploadFile(file: File) {
    this.uploadingImage.set(true);
    this.api.adminUploadContentImage(file).subscribe({
      next: (res) => {
        this.insertImage(res.url);
        this.uploadingImage.set(false);
      },
      error: () => {
        this.uploadingImage.set(false);
      },
    });
  }
}
