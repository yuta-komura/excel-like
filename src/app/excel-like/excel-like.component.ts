/***************************************************************************************************
 *  ExcelLikeComponent
 *  -----------------------------------------------------------------------------------------------
 *  • 1 画面に 5000 × 3000 セルを “仮想レンダリング” しつつ、
 *  • 右側に縦スクロールバー、画面最下部に横スクロールバー（縦バー幅ぶん欠けた Excel-風 L 字）
 *  • ２つのバーは双方向に位置を同期
 *  • スクロールバー幅（OS／ブラウザ依存）を動的に測定して横バーの右端余白へ反映
 *
 *  ※ Angular 13 以降（stand-alone component）でそのままビルド可能
 ***************************************************************************************************/
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
  /* ----------------------------------------------------------------
   * テンプレート
   * ----------------------------------------------------------------
   * ┌─ wrapper ───────────────────────────────────────────────┐
   * │  ├─ verticalScrollWrapper  (flex: 1)  ← 表示セル         │
   * │  └─ horizontalScrollSync  (固定 16px) ← 横スクロールバー │
   * └─────────────────────────────────────────────────────────┘ */
  template: `
    <div class="wrapper">
      <!-- ▼縦スクロール領域（右端に縦バー） -->
      <div
        #verticalScroll
        class="vertical-scroll-wrapper"
        (scroll)="onVerticalScroll()"
      >
        <div [style.height.px]="contentHeight" style="position: relative;">
          <!-- 横方向 仮想スクロール -->
          <cdk-virtual-scroll-viewport
            #viewport
            orientation="horizontal"
            itemSize="180"
            class="horizontal-scroll-viewport"
            [style.height.px]="contentHeight"
          >
            <!-- 各列 -->
            <div
              *cdkVirtualFor="let item of items; trackBy: trackByIndex"
              class="column"
            >
              <!-- 各セル（縦方向は手動レンダリング） -->
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

      <!-- ▼横スクロールバー（画面最下部） -->
      <div #horizontalScrollSync class="horizontal-scroll-sync">
        <!-- 横幅だけ確保するダミー要素 -->
        <div [style.width.px]="totalScrollWidth"></div>
      </div>
    </div>
  `,
  /* ----------------------------------------------------------------
   * スタイル
   * ---------------------------------------------------------------- */
  styles: [
    /* wrapper ----------------------------------------------------- */
    `
      .wrapper {
        height: 800px;
        border: 1px solid #000;
        display: flex;
        flex-direction: column; /* 子を縦方向に並べる */
        overflow: hidden;
        font-family: sans-serif;
      }
    `,
    /* 縦スクロール ------------------------------------------------ */
    `
      .vertical-scroll-wrapper {
        flex: 1;
        overflow-y: auto;
        position: relative;
      }
    `,
    /* 横スクロール（CDK ビューポート） --------------------------- */
    `
      .horizontal-scroll-viewport {
        white-space: nowrap;
        background: #f8f8f8;
        /* 内部スクロールバーは非表示にする */
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE 10+ */
      }
      .horizontal-scroll-viewport::-webkit-scrollbar {
        display: none; /* Chrome / Edge / Safari */
      }
    `,
    /* 横スクロールバー（同期バー） ------------------------------- */
    `
      .horizontal-scroll-sync {
        height: 16px; /* 通常の scrollbar 高さ */
        overflow-x: auto;
        background: #eee;
        /* 右端余白は TS 側で margin-right を動的設定 */
      }
      .horizontal-scroll-sync > div {
        height: 1px; /* 幅確保用：描画は不要 */
      }
    `,
    /* 列 --------------------------------------------------------- */
    `
      .column {
        width: 180px;
        display: inline-block;
        vertical-align: top;
        border: 1px solid #ccc;
        background: #fff;
        position: relative;
        min-height: 100%;
        box-sizing: border-box;
      }
    `,
    /* セル ------------------------------------------------------- */
    `
      .cell {
        position: absolute;
        left: 0;
        right: 0;
        height: 42px;
        background: #ccc;
        text-align: center;
        line-height: 40px;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        box-sizing: border-box;
      }
    `,
  ],
})
export class ExcelLikeComponent implements AfterViewInit {
  /* ──────────────────────────────────────────────────────────
   * ViewChild
   * ────────────────────────────────────────────────────────── */
  @ViewChild('viewport') private viewportRef!: CdkVirtualScrollViewport;
  @ViewChild('verticalScroll') private vScrollRef!: ElementRef<HTMLElement>;
  @ViewChild('horizontalScrollSync')
  private hScrollSyncRef!: ElementRef<HTMLElement>;

  /* ──────────────────────────────────────────────────────────
   * 定数・データ
   * ────────────────────────────────────────────────────────── */
  readonly itemWidth = 180; // 列幅
  readonly itemMargin = 8; // 列間隔
  readonly itemHeight = 44; // セル高さ (40 + margin 2*2)
  readonly buffer = 10; // 仮想レンダリング前後バッファ
  readonly viewHeight = 800; // wrapper 高さ (CSS と合わせる)

  /** 疑似データ： 10,000 列 × 3,000 行 */
  readonly items = Array.from({ length: 10_000 }, (_, i) => ({
    id: i,
    subDivs: Array.from({ length: 3_000 }, (_, j) => `${i}-${j}`),
  }));

  /* ──────────────────────────────────────────────────────────
   * コンストラクタ
   * ────────────────────────────────────────────────────────── */
  constructor(private zone: NgZone, private cd: ChangeDetectorRef) {}

  /* ──────────────────────────────────────────────────────────
   * ゲッター
   * ────────────────────────────────────────────────────────── */
  /** 縦方向全体の高さ (ピクセル) */
  get contentHeight(): number {
    return this.items[0].subDivs.length * this.itemHeight;
  }

  /** 横方向全体の幅 (ピクセル) */
  get totalScrollWidth(): number {
    return this.items.length * (this.itemWidth + this.itemMargin);
  }

  /* ──────────────────────────────────────────────────────────
   * 縦スクロール → 可視セル計算
   * ────────────────────────────────────────────────────────── */
  private scrollTop = 0;

  onVerticalScroll(): void {
    this.scrollTop = this.vScrollRef.nativeElement.scrollTop;
  }

  /** 現在描画すべき行インデックス配列 */
  getVisibleIndexes(): number[] {
    const start = Math.floor(this.scrollTop / this.itemHeight) - this.buffer;
    const end =
      Math.ceil((this.scrollTop + this.viewHeight) / this.itemHeight) +
      this.buffer;

    const from = Math.max(0, start);
    const to = Math.min(this.items[0].subDivs.length, end);

    return Array.from({ length: to - from }, (_, i) => i + from);
  }

  trackByIndex(i: number): number {
    return i;
  }

  /* ──────────────────────────────────────────────────────────
   * AfterViewInit
   * ────────────────────────────────────────────────────────── */
  ngAfterViewInit(): void {
    const mainScroll = this.viewportRef.elementRef.nativeElement;
    const hSync = this.hScrollSyncRef.nativeElement;
    const hSyncDummy = hSync.firstElementChild as HTMLElement;
    const vHost = this.vScrollRef.nativeElement;

    let isSyncingFromMain = false;
    let isSyncingFromSync = false;

    /** 横スクロール同期（main → hSync） */
    mainScroll.addEventListener('scroll', () => {
      if (isSyncingFromSync) return;
      isSyncingFromMain = true;

      requestAnimationFrame(() => {
        const target = mainScroll.scrollLeft;
        if (Math.abs(hSync.scrollLeft - target) > 1) {
          hSync.scrollLeft = target;
        }
        isSyncingFromMain = false;
      });
    });

    /** 横スクロール同期（hSync → main） + clamp */
    hSync.addEventListener('scroll', () => {
      if (isSyncingFromMain) return;
      isSyncingFromSync = true;

      requestAnimationFrame(() => {
        const maxMainScrollLeft =
          mainScroll.scrollWidth - mainScroll.clientWidth;
        const clamped = Math.min(hSync.scrollLeft, maxMainScrollLeft);
        if (Math.abs(mainScroll.scrollLeft - clamped) > 1) {
          mainScroll.scrollLeft = clamped;
        }
        isSyncingFromSync = false;
      });
    });

    /** 横バー幅の調整（右余白） */
    const applyScrollbarGap = () => {
      const gap = vHost.offsetWidth - vHost.clientWidth;
      hSync.style.marginRight = `${gap}px`;
    };
    applyScrollbarGap();
    window.addEventListener('resize', applyScrollbarGap);

    /** ダミー横幅を CDK に合わせて補正（最大 scrollLeft のズレ解消） */
    setTimeout(() => {
      const trueScrollWidth = mainScroll.scrollWidth;
      hSyncDummy.style.width = `${trueScrollWidth}px`;
      console.log('補正後 hSync ダミー幅 =', hSyncDummy.style.width);

      this.scrollTop = vHost.scrollTop;
      this.cd.detectChanges();
    }, 0);
  }
}
