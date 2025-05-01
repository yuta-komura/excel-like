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
      <!-- 列ヘッダー -->
      <div class="column-header" [style.left.px]="-scrollLeft">
        <div class="row-header-cell header-corner"></div>
        <div
          class="header-cell"
          *ngFor="let col of items; let i = index"
          [style.width.px]="cellWidth"
        >
          {{ getColumnLabel(i) }}
        </div>
      </div>

      <!-- 横スクロールバー -->
      <div #horizontalScrollSync class="horizontal-scroll-sync">
        <div [style.width.px]="totalScrollWidth"></div>
      </div>

      <!-- 本体 -->
      <div
        #verticalScroll
        class="vertical-scroll-wrapper"
        (scroll)="onScroll()"
      >
        <div [style.height.px]="contentHeight" style="position: relative;">
          <!-- 行ヘッダー -->
          <div class="row-header" [style.top.px]="scrollTop">
            <div
              class="row-header-cell"
              *ngFor="let j of getVisibleIndexes(); trackBy: trackByIndex"
              [style.height.px]="cellHeight"
            >
              {{ j + 1 }}
            </div>
          </div>

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
              [style.width.px]="cellWidth"
            >
              <div
                *ngFor="let j of getVisibleIndexes(); trackBy: trackByIndex"
                class="cell"
                [style.height.px]="cellHeight"
                [style.top.px]="j * cellHeight"
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
        position: relative;
      }

      .horizontal-scroll-sync {
        height: 16px;
        overflow-x: auto;
        background: #eee;
      }

      .horizontal-scroll-sync > div {
        height: 1px;
      }

      .vertical-scroll-wrapper {
        flex: 1;
        overflow: auto;
        position: relative;
      }

      .horizontal-scroll-wrapper {
        white-space: nowrap;
        background: white;
      }

      .column {
        display: inline-block;
        position: relative;
      }

      .cell {
        position: absolute;
        left: 0;
        right: 0;
        text-align: center;
        line-height: 40px;
        font-size: 14px;
        border-bottom: 1px solid #ccc;
        border-right: 1px solid #ccc;
        box-sizing: border-box;
        background: #fff;
      }

      .column-header {
        display: flex;
        position: sticky;
        top: 0;
        z-index: 3;
        background: #e0e0e0;
        border-bottom: 1px solid #aaa;
      }

      .header-cell {
        height: 40px;
        line-height: 40px;
        text-align: center;
        border-right: 1px solid #ccc;
        box-sizing: border-box;
        font-weight: bold;
        background: #f5f5f5;
      }

      .header-corner {
        background: #d0d0d0;
      }

      .row-header {
        position: absolute;
        left: 0;
        width: 50px;
        z-index: 2;
      }

      .row-header-cell {
        width: 50px;
        line-height: 44px;
        background: #f0f0f0;
        border-bottom: 1px solid #ccc;
        border-right: 1px solid #ccc;
        text-align: center;
        box-sizing: border-box;
        font-weight: bold;
      }

      ::ng-deep .cdk-virtual-scroll-viewport {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      ::ng-deep .cdk-virtual-scroll-viewport::-webkit-scrollbar {
        display: none;
      }
    `,
  ],
})
export class ExcelLikeComponent implements AfterViewInit {
  @ViewChild('viewport') virtualViewportRef!: CdkVirtualScrollViewport;
  @ViewChild('verticalScroll') verticalScrollRef!: ElementRef<HTMLElement>;
  @ViewChild('horizontalScrollSync')
  horizontalScrollSyncRef!: ElementRef<HTMLElement>;

  cellHeight = 44;
  cellWidth = 180;
  buffer = 10;
  scrollTop = 0;
  scrollLeft = 0;

  items = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    subDivs: Array.from({ length: 1000 }, (_, j) => `R${j + 1}C${i + 1}`),
  }));

  get contentHeight(): number {
    return this.items[0].subDivs.length * this.cellHeight;
  }

  get totalScrollWidth(): number {
    return this.items.length * this.cellWidth;
  }

  onScroll(): void {
    const el = this.verticalScrollRef.nativeElement;
    this.scrollTop = el.scrollTop;
    this.scrollLeft = el.scrollLeft;
  }

  getVisibleIndexes(): number[] {
    const start = Math.floor(this.scrollTop / this.cellHeight) - this.buffer;
    const end =
      Math.ceil((this.scrollTop + 800) / this.cellHeight) + this.buffer;
    const from = Math.max(0, start);
    const to = Math.min(this.items[0].subDivs.length, end);
    return Array.from({ length: to - from }, (_, i) => i + from);
  }

  trackByIndex(index: number): number {
    return index;
  }

  getColumnLabel(index: number): string {
    let label = '';
    while (index >= 0) {
      label = String.fromCharCode((index % 26) + 65) + label;
      index = Math.floor(index / 26) - 1;
    }
    return label;
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

    setTimeout(() => {
      const el = this.verticalScrollRef.nativeElement;
      this.scrollTop = el.scrollTop;
      this.scrollLeft = el.scrollLeft;
    }, 0);
  }
}
