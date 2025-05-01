import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  NgZone,
  ChangeDetectorRef,
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
  template: `
    <div class="wrapper">
      <!-- 横スクロールバーだけ分離 -->
      <div #horizontalScrollSync class="horizontal-scroll-sync">
        <div [style.width.px]="totalScrollWidth"></div>
      </div>

      <!-- 縦スクロール領域 -->
      <div
        #verticalScroll
        class="vertical-scroll-wrapper"
        (scroll)="onScroll()"
      >
        <div [style.height.px]="contentHeight" style="position: relative;">
          <!-- 横スクロール（中身） -->
          <cdk-virtual-scroll-viewport
            orientation="horizontal"
            itemSize="180"
            class="horizontal-scroll-wrapper"
            #viewport
            [style.height.px]="contentHeight"
          >
            <div
              *cdkVirtualFor="let item of items; trackBy: trackByIndex"
              class="column"
            >
              <div
                *ngFor="let j of getVisibleIndexes(); trackBy: trackByIndex"
                class="cell"
                [style.top.px]="j * itemHeight"
              >
                {{ item.subDivs[j] }}
              </div>
            </div>
          </cdk-virtual-scroll-viewport>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .wrapper {
        height: 800px;
        border: 1px solid black;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        font-family: sans-serif;
      }

      .horizontal-scroll-sync {
        height: 16px;
        overflow-x: auto;
        background: #eee;
      }
      .horizontal-scroll-sync > div {
        height: 1px; /* 見えないが幅を確保 */
      }

      .vertical-scroll-wrapper {
        flex: 1;
        overflow-y: auto;
        position: relative;
      }

      .horizontal-scroll-wrapper {
        white-space: nowrap;
        background: #f8f8f8;
      }

      .column {
        width: 180px;
        display: inline-block;
        vertical-align: top;
        margin-right: 8px;
        border: 1px solid #ccc;
        background: white;
        position: relative;
        min-height: 100%;
        box-sizing: border-box;
      }

      .cell {
        position: absolute;
        left: 0;
        right: 0;
        height: 40px;
        margin: 2px 0;
        background: #ccc;
        text-align: center;
        line-height: 40px;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        box-sizing: border-box;
      }

      ::ng-deep .cdk-virtual-scroll-viewport {
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE 10+ */
      }

      ::ng-deep .cdk-virtual-scroll-viewport::-webkit-scrollbar {
        display: none; /* Chrome, Safari */
      }
    `,
  ],
})
export class ExcelLikeComponent implements AfterViewInit {
  @ViewChild('viewport') virtualViewportRef!: CdkVirtualScrollViewport;
  @ViewChild('verticalScroll') verticalScrollRef!: ElementRef<HTMLElement>;
  @ViewChild('horizontalScrollSync')
  horizontalScrollSyncRef!: ElementRef<HTMLElement>;

  itemHeight = 44;
  buffer = 10;
  scrollTop = 0;

  items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    subDivs: Array.from({ length: 3000 }, (_, j) => `${i}-${j}`),
  }));

  get contentHeight(): number {
    return this.items[0].subDivs.length * this.itemHeight;
  }

  get totalScrollWidth(): number {
    return this.items.length * (180 + 8); // item width + margin
  }

  onScroll(): void {
    this.scrollTop = this.verticalScrollRef.nativeElement.scrollTop;
  }

  getVisibleIndexes(): number[] {
    const start = Math.floor(this.scrollTop / this.itemHeight) - this.buffer;
    const end =
      Math.ceil((this.scrollTop + 800) / this.itemHeight) + this.buffer;
    const from = Math.max(0, start);
    const to = Math.min(this.items[0].subDivs.length, end);
    return Array.from({ length: to - from }, (_, i) => i + from);
  }

  trackByIndex(index: number): number {
    return index;
  }

  constructor(private zone: NgZone, private cd: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    const mainScroll = this.virtualViewportRef.elementRef.nativeElement;
    const syncScroll = this.horizontalScrollSyncRef.nativeElement;

    // main → sync
    mainScroll.addEventListener('scroll', () => {
      syncScroll.scrollLeft = mainScroll.scrollLeft;
    });

    // sync → main
    syncScroll.addEventListener('scroll', () => {
      mainScroll.scrollLeft = syncScroll.scrollLeft;
    });

    // 初期スクロール位置
    setTimeout(() => {
      this.scrollTop = this.verticalScrollRef.nativeElement.scrollTop;
    }, 0);
  }
}
