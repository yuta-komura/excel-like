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
        overflow-y: hidden;
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
        margin-right: 8px;
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
    const mainScroll = this.viewportRef.elementRef.nativeElement; // CDK 横スクロール本体
    const hSync = this.hScrollSyncRef.nativeElement; // 最下部バー
    const vHost = this.vScrollRef.nativeElement; // 縦スクロール host

    /* 双方向スクロール同期 ------------------------------------------------ */
    mainScroll.addEventListener('scroll', () => {
      hSync.scrollLeft = mainScroll.scrollLeft;
    });
    hSync.addEventListener('scroll', () => {
      mainScroll.scrollLeft = hSync.scrollLeft;
    });

    /* 縦スクロールバー幅を測定し、横バーの右余白へ反映 -------------------- */
    const applyScrollbarGap = () => {
      const gap = vHost.offsetWidth - vHost.clientWidth; // = 縦バーの幅
      hSync.style.marginRight = `${gap}px`;
    };

    // 初期化時とリサイズ時に反映
    applyScrollbarGap();
    window.addEventListener('resize', applyScrollbarGap);

    /* 初期スクロール位置を保持 ------------------------------------------- */
    setTimeout(() => {
      this.scrollTop = vHost.scrollTop;
      this.cd.detectChanges(); // 初回可視セル計算を確実に
    }, 0);
  }
}
