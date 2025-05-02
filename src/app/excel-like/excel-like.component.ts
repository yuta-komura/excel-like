import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ScrollingModule,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';

@Component({
  selector: 'app-excel-like',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  templateUrl: './excel-like.component.html',
  styleUrls: ['./excel-like.component.css'],
})
export class ExcelLikeComponent implements AfterViewInit {
  @ViewChild('viewport') private viewportRef!: CdkVirtualScrollViewport;
  @ViewChild('headerViewport')
  private headerViewportRef!: CdkVirtualScrollViewport;
  @ViewChild('verticalScroll') private vScrollRef!: ElementRef<HTMLElement>;
  @ViewChild('horizontalScrollSync')
  private hScrollSyncRef!: ElementRef<HTMLElement>;

  readonly itemWidth = 180;
  readonly rowHeight = 44;
  readonly headerHeight = 44;
  readonly buffer = 10;
  scrollbarGap = 16;

  readonly items = Array.from({ length: 10_000 }, (_, i) => ({
    id: i,
    subDivs: Array.from({ length: 3_000 }, (_, j) => `R${j + 1}-C${i + 1}`),
  }));
  // readonly items = Array.from({ length: 10_000 }, (_, i) => ({
  //   id: i,
  //   subDivs: Array.from({ length: 3_000 }, (_, j) => ''),
  // }));

  editingCell: { i: number; j: number } | null = null;
  selectedCell: { i: number; j: number } | null = null;

  constructor(private cd: ChangeDetectorRef, private ngZone: NgZone) {}

  get contentHeight(): number {
    return this.items[0]?.subDivs.length * this.rowHeight;
  }

  get totalScrollWidth(): number {
    return this.items.length * this.itemWidth + (this.scrollbarGap || 16);
  }

  private scrollTop = 0;

  onVerticalScroll(): void {
    this.scrollTop = this.vScrollRef.nativeElement.scrollTop;
  }

  getVisibleIndexes(): number[] {
    const start = Math.floor(this.scrollTop / this.rowHeight) - this.buffer;
    const end =
      Math.ceil(
        (this.scrollTop + 800 - this.headerHeight - 16) / this.rowHeight
      ) + this.buffer;
    const from = Math.max(0, start);
    const to = Math.min(this.items[0]?.subDivs.length || 0, end);
    return Array.from({ length: to - from }, (_, i) => i + from);
  }

  trackByIndex(i: number): number {
    return i;
  }

  toExcelColumn(index: number): string {
    let col = '';
    while (index >= 0) {
      col = String.fromCharCode((index % 26) + 65) + col;
      index = Math.floor(index / 26) - 1;
    }
    return col;
  }

  isEditingCell(i: number, j: number): boolean {
    return this.editingCell?.i === i && this.editingCell?.j === j;
  }

  isSelectedCell(i: number, j: number): boolean {
    return this.selectedCell?.i === i && this.selectedCell?.j === j;
  }

  selectCell(i: number, j: number): void {
    this.selectedCell = { i, j };
  }

  startEdit(i: number, j: number): void {
    this.editingCell = { i, j };
    setTimeout(() => {
      const inputEl = document.querySelector(
        `input[data-cell-id="${i}-${j}"]`
      ) as HTMLInputElement | null;
      inputEl?.focus();
      inputEl?.select();
    });
  }

  commitEdit(i: number, j: number, value: string): void {
    this.items[i].subDivs[j] = value;
    this.editingCell = null;
  }

  onCellBlur(event: FocusEvent, i: number, j: number): void {
    const input = event.target as HTMLInputElement;
    this.commitEdit(i, j, input.value);
  }

  onCellEnter(event: Event, i: number, j: number): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter') {
      const input = event.target as HTMLInputElement;
      this.commitEdit(i, j, input.value);
    }
  }

  cancelEdit(): void {
    this.editingCell = null;
  }

  handleKeydown(event: KeyboardEvent, i: number, j: number): void {
    const input = event.target as HTMLInputElement;
    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        this.commitEdit(i, j, input.value);
        this.startEdit(i + 1, j);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.commitEdit(i, j, input.value);
        this.startEdit(i, j + 1);
        break;
    }
  }

  ngAfterViewInit(): void {
    const mainScroll = this.viewportRef.elementRef.nativeElement;
    const headerScroll = this.headerViewportRef.elementRef.nativeElement;
    const hSync = this.hScrollSyncRef.nativeElement;

    this.ngZone.runOutsideAngular(() => {
      mainScroll.addEventListener('scroll', () => {
        hSync.scrollLeft = mainScroll.scrollLeft;
        headerScroll.scrollLeft = mainScroll.scrollLeft;
      });

      hSync.addEventListener('scroll', () => {
        mainScroll.scrollLeft = hSync.scrollLeft;
        headerScroll.scrollLeft = hSync.scrollLeft;

        requestAnimationFrame(() => {
          const max = mainScroll.scrollWidth - mainScroll.clientWidth;
          const diff = Math.abs(mainScroll.scrollLeft - max);
          if (diff < 80) {
            this.viewportRef.scrollToIndex(this.items.length - 1, 'smooth');
            this.viewportRef.checkViewportSize();
            this.cd.detectChanges();
          }
        });
      });
    });

    setTimeout(() => {
      const vHost = this.vScrollRef.nativeElement;
      this.scrollbarGap = vHost.offsetWidth - vHost.clientWidth || 16;
      this.cd.detectChanges();
    }, 0);
  }
}
