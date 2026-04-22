import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

// ── Item pools by zone ──────────────────────────────────────────────────────
const POOL_TOP_LARGE   = ['🎒','🏈','⚽','🎸','🛹','🎿','🥊','🏀','🎭','🪃','🏸','🎺','🪘','🎷'];
const POOL_TOP_ACCENT  = ['⭐','🏆','🪆','🎀','🪅','🎯','🧿','🔮','💫','🌟','🎖️','🏅','🪩','🎠'];
const POOL_SMALL       = ['✏️','🖊️','📐','🔑','🏷️','📎','🖋️','📏','🪄','🗂️','🔖','📌','⚙️','🔩','🪬','🗝️','🧷','📍'];
const POOL_DRINK       = ['💧','🧃','☕','🥤','🫗','🧋','🍵','🫖','🧊','🍶','🥛'];
const POOL_HAT         = ['🧢','🪖','👒','🎩','⛑️','🥽','🕶️','🎓'];
const POOL_ELECTRONICS = ['🎧','📷','🎮','📱','🎵','🎤','🔦','🔭','🔬','💡','⌨️','🖱️','📻','🕹️'];
const POOL_TOY         = ['🧸','🪀','🎲','🪁','🎯','🪃','🎪','🤖','🪅','🎴','🃏','🪆'];
const POOL_SNACK       = ['🍎','🍊','🥨','🍫','🍪','🥜','🍬','🍭','🥐','🧁','🍿','🥕','🍩','🧇','🥪'];
const POOL_BOOK        = ['📓','📔','📒','📕','📗','📘','📙','📚'];
const POOL_BAG         = ['💼','🎒','👜','🧳','🛍️','🎽','🩱'];
const POOL_MISC        = ['🔒','🧲','⌚','🪙','🧮','🗃️','📦','🔎','🪬','💿','📀','🪤'];
const POOL_CLOTHES     = ['🧤','🧣','🧦','🎀','🩴','👟','👕','🩳','🧷','👔','🥾','🧩'];
const POOL_TOILETRY    = ['🧴','🪥','🧼','🪞','🩹','💊','🪒','🫧','🪮','🧽'];
const POOL_HANG_L      = ['🧥','🎽','🪂','🎒','👜','🏋️','🪃'];
const POOL_HANG_R      = ['🧥','🎿','🛹','🧢','👓','🎸','🪁'];
const SURPRISES        = ['bird','banana','lunchbox','sock','cat','worm','fish','spider','ghost'];

export interface LockerItem {
  emoji: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  fontSize: string;
  rotation?: number;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = arr.slice();
  const result: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function rot(): number { return Math.round((Math.random() - 0.5) * 26); }

@Component({
  selector: 'app-locker-opening-animation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './locker-opening-animation.component.html',
  styleUrl: './locker-opening-animation.component.scss',
})
export class LockerOpeningAnimationComponent implements OnInit {
  @Input() doorGradient = 'linear-gradient(135deg, #6aabdf 0%, #1a7ac8 45%, #1458a0 100%)';
  @Output() done = new EventEmitter<void>();

  protected isOpening = signal(false);
  protected isFading  = signal(false);

  protected readonly hangLeft:  string     = pick(POOL_HANG_L);
  protected readonly hangRight: string     = pick(POOL_HANG_R);
  protected readonly books:     string[]   = pickN(POOL_BOOK, 3);
  protected readonly items:     LockerItem[] = this.buildItems();
  protected readonly surprise:  string | null =
    Math.random() < 0.60 ? pick(SURPRISES) : null;

  ngOnInit(): void {
    setTimeout(() => {
      this.isOpening.set(true);
      setTimeout(() => {
        this.isFading.set(true);
        setTimeout(() => this.done.emit(), 400);
      }, 900);
    }, 1300);
  }

  private buildItems(): LockerItem[] {
    return [
      // ── Top zone — big statement items ──────────────────────────────────
      { emoji: pick(POOL_TOP_LARGE),   top: '1%',  left: '1%',   fontSize: 'clamp(5rem,10vw,8.5rem)',  rotation: rot() },
      { emoji: pick(POOL_TOP_ACCENT),  top: '1%',  right: '2%',  fontSize: 'clamp(3.5rem,7vw,6.5rem)', rotation: rot() },
      { emoji: pick(POOL_TOP_LARGE),   top: '3%',  left: '46%',  fontSize: 'clamp(3rem,6vw,5.5rem)',   rotation: rot() },
      // ── Small items scattered near top ──────────────────────────────────
      { emoji: pick(POOL_SMALL),       top: '13%', right: '10%', fontSize: 'clamp(2rem,4vw,3.2rem)',   rotation: rot() },
      { emoji: pick(POOL_SMALL),       top: '16%', left: '20%',  fontSize: 'clamp(1.6rem,3.2vw,2.6rem)', rotation: rot() },
      { emoji: pick(POOL_MISC),        top: '21%', right: '22%', fontSize: 'clamp(1.6rem,3vw,2.4rem)', rotation: rot() },
      { emoji: pick(POOL_SMALL),       top: '18%', left: '44%',  fontSize: 'clamp(1.4rem,2.8vw,2.2rem)', rotation: rot() },
      // ── On / near top shelf ─────────────────────────────────────────────
      { emoji: pick(POOL_DRINK),       top: '23%', left: '3%',   fontSize: 'clamp(3rem,6vw,5rem)',     rotation: rot() },
      { emoji: pick(POOL_HAT),         top: '22%', right: '3%',  fontSize: 'clamp(2.5rem,5vw,4.5rem)', rotation: rot() },
      { emoji: pick(POOL_SNACK),       top: '23%', left: '40%',  fontSize: 'clamp(2rem,4vw,3.5rem)',   rotation: rot() },
      { emoji: pick(POOL_TOILETRY),    top: '24%', right: '36%', fontSize: 'clamp(1.6rem,3vw,2.6rem)', rotation: rot() },
      // ── Mid zone (between shelves) ──────────────────────────────────────
      { emoji: pick(POOL_ELECTRONICS), top: '35%', left: '2%',   fontSize: 'clamp(3.5rem,7vw,6rem)',   rotation: rot() },
      { emoji: pick(POOL_TOY),         top: '36%', right: '2%',  fontSize: 'clamp(3rem,6vw,5.5rem)',   rotation: rot() },
      { emoji: pick(POOL_ELECTRONICS), top: '38%', left: '44%',  fontSize: 'clamp(2.5rem,5vw,4rem)',   rotation: rot() },
      { emoji: pick(POOL_SNACK),       top: '46%', left: '18%',  fontSize: 'clamp(2rem,4vw,3.2rem)',   rotation: rot() },
      { emoji: pick(POOL_BOOK),        top: '47%', right: '17%', fontSize: 'clamp(2rem,4vw,3.4rem)',   rotation: rot() },
      { emoji: pick(POOL_MISC),        top: '52%', left: '42%',  fontSize: 'clamp(1.6rem,3.2vw,2.8rem)', rotation: rot() },
      { emoji: pick(POOL_TOY),         top: '50%', left: '5%',   fontSize: 'clamp(2rem,4vw,3.5rem)',   rotation: rot() },
      // ── Lower mid zone ──────────────────────────────────────────────────
      { emoji: pick(POOL_BAG),         top: '54%', right: '4%',  fontSize: 'clamp(3rem,6vw,5rem)',     rotation: rot() },
      { emoji: pick(POOL_MISC),        top: '57%', left: '36%',  fontSize: 'clamp(2rem,4vw,3.2rem)',   rotation: rot() },
      // ── Near bottom shelf ───────────────────────────────────────────────
      { emoji: pick(POOL_CLOTHES),     top: '67%', left: '12%',  fontSize: 'clamp(2rem,4vw,3.2rem)',   rotation: rot() },
      { emoji: pick(POOL_TOILETRY),    top: '68%', right: '11%', fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', rotation: rot() },
      { emoji: pick(POOL_SNACK),       top: '68%', left: '44%',  fontSize: 'clamp(1.6rem,3vw,2.4rem)', rotation: rot() },
      // ── Floor / bottom ──────────────────────────────────────────────────
      { emoji: pick(POOL_CLOTHES),     bottom: '2%', left: '4%',  fontSize: 'clamp(2.5rem,5vw,4.5rem)', rotation: rot() },
      { emoji: pick(POOL_BAG),         bottom: '3%', right: '3%', fontSize: 'clamp(2rem,4vw,3.8rem)',   rotation: rot() },
      { emoji: pick(POOL_SNACK),       bottom: '4%', left: '40%', fontSize: 'clamp(1.8rem,3.5vw,3rem)', rotation: rot() },
    ];
  }
}
