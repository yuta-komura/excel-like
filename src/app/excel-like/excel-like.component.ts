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
      <!-- ▼ヘッダー + セルを縦スクロールにまとめる -->
      <div
        #verticalScroll
        class="vertical-scroll-wrapper"
        (scroll)="onVerticalScroll()"
      >
        <!-- ヘッダー -->
        <div class="header-row">
          <div class="corner-spacer"></div>
          <cdk-virtual-scroll-viewport
            orientation="horizontal"
            itemSize="180"
            class="horizontal-header-viewport"
            [style.height.px]="headerHeight"
            [style.overflow]="'hidden'"
            #headerViewport
            [minBufferPx]="1000"
            [maxBufferPx]="3000"
          >
            <div
              *cdkVirtualFor="let item of items; let i = index"
              class="header-cell"
            >
              {{ toExcelColumn(i) }}
            </div>
          </cdk-virtual-scroll-viewport>
        </div>

        <!-- セル -->
        <div [style.height.px]="contentHeight" class="content-inner">
          <div class="row-number-area">
            <div
              *ngFor="let j of getVisibleIndexes(); trackBy: trackByIndex"
              class="row-number"
              [style.top.px]="j * rowHeight"
            >
              {{ j + 1 }}
            </div>
          </div>

          <cdk-virtual-scroll-viewport
            #viewport
            orientation="horizontal"
            itemSize="180"
            class="horizontal-scroll-viewport"
            [style.height.px]="contentHeight"
            [minBufferPx]="1000"
            [maxBufferPx]="3000"
          >
            <div *cdkVirtualFor="let item of items" class="column">
              <div
                *ngFor="let j of getVisibleIndexes(); trackBy: trackByIndex"
                class="cell"
                [style.top.px]="j * rowHeight"
              >
                {{ item.subDivs[j] }}
              </div>
            </div>
          </cdk-virtual-scroll-viewport>
        </div>
      </div>

      <!-- 横スクロールバー＋右下L字スペーサー -->
      <div class="horizontal-bar-wrapper">
        <div #horizontalScrollSync class="horizontal-scroll-sync">
          <div
            class="horizontal-scroll-content"
            [style.width.px]="totalScrollWidth"
          ></div>
        </div>
        <div
          class="scroll-corner-spacer"
          [style.width.px]="scrollbarGap || 16"
          [style.height.px]="scrollbarGap || 16"
        ></div>
      </div>
    </div>
  `,
  styles: [
    `
      .wrapper {
        height: 800px;
        display: flex;
        flex-direction: column;
        font-family: sans-serif;
        border: 1px solid #000;
        overflow: hidden;
      }

      /* 縦スクロール領域 */
      .vertical-scroll-wrapper {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        position: relative;
      }

      /* ヘッダー */
      .header-row {
        display: flex;
        flex-direction: row;
        position: sticky;
        top: 0;
        z-index: 5;
        background: #ddd;
      }

      .corner-spacer {
        width: 60px;
        height: 44px;
        background: #eee;
        border-right: 1px solid #ccc;
        border-bottom: 1px solid #ccc;
        flex-shrink: 0;
      }

      .horizontal-header-viewport {
        background: #ddd;
        border-bottom: 1px solid #888;
        white-space: nowrap;
        flex: 1;
      }

      .header-cell {
        width: 180px;
        display: inline-block;
        text-align: center;
        font-weight: bold;
        line-height: 42px;
        height: 44px;
        box-sizing: border-box;
        border-right: 1px solid #bbb;
        background: #f0f0f0;
      }

      /* セル本体 */
      .content-inner {
        display: flex;
        width: 100%;
        position: relative;
      }

      .row-number-area {
        width: 60px;
        background: #eee;
        border-right: 1px solid #ccc;
        position: relative;
        flex-shrink: 0;
        z-index: 2;
      }

      .row-number {
        position: absolute;
        width: 100%;
        height: 44px;
        line-height: 42px;
        text-align: right;
        padding-right: 8px;
        font-size: 14px;
        border-bottom: 1px solid #ccc;
        box-sizing: border-box;
        background: #eee;
      }

      .horizontal-scroll-viewport {
        flex: 1;
        white-space: nowrap;
        background: #f8f8f8;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      .horizontal-scroll-viewport::-webkit-scrollbar {
        display: none;
      }

      .column {
        width: 180px;
        display: inline-block;
        vertical-align: top;
        position: relative;
        box-sizing: border-box;
      }

      .cell {
        position: absolute;
        left: 0;
        right: 0;
        height: 44px;
        line-height: 42px;
        text-align: center;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        border-bottom: 1px solid #ccc;
        border-right: 1px solid #ccc;
        box-sizing: border-box;
        z-index: 1;
      }

      /* 横スクロールバー + L字スペーサー */
      .horizontal-bar-wrapper {
        display: flex;
        flex-direction: row;
        height: 16px;
        background: #eee;
      }

      .horizontal-scroll-sync {
        flex: 1;
        overflow-x: auto;
        position: relative;
      }

      .horizontal-scroll-content {
        height: 1px;
      }

      .scroll-corner-spacer {
        background: #ddd;
        flex-shrink: 0;
      }
    `,
  ],
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
  scrollbarGap = 16; // fallback

  readonly items = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    subDivs: Array.from({ length: 200 }, (_, j) => `R${j + 1}-C${i + 1}`),
  }));

  constructor(private cd: ChangeDetectorRef) {}

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

  ngAfterViewInit(): void {
    const mainScroll = this.viewportRef.elementRef.nativeElement;
    const headerScroll = this.headerViewportRef.elementRef.nativeElement;
    const hSync = this.hScrollSyncRef.nativeElement;

    mainScroll.addEventListener('scroll', () => {
      hSync.scrollLeft = mainScroll.scrollLeft;
      headerScroll.scrollLeft = mainScroll.scrollLeft;
    });

    hSync.addEventListener('scroll', () => {
      mainScroll.scrollLeft = hSync.scrollLeft;
      headerScroll.scrollLeft = hSync.scrollLeft;

      // ✅ スクロールが末端近くまできたら強制的に最終列を描画
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

    setTimeout(() => {
      const vHost = this.vScrollRef.nativeElement;
      this.scrollbarGap = vHost.offsetWidth - vHost.clientWidth || 16;
      this.cd.detectChanges();
    }, 0);
  }
}
