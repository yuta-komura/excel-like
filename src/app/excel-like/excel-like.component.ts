import {
  Component, // コンポーネントを定義するためのデコレーター
  ElementRef, // DOM 要素への参照を扱うための型
  ViewChild, // テンプレートから要素を取得するデコレーター
  AfterViewInit, // ビュー初期化後のライフサイクルインターフェイス
  ChangeDetectorRef, // 変更検知を手動で行うためのクラス
  NgZone, // Angular のゾーン外で処理を実行するためのクラス
} from '@angular/core';
import { CommonModule } from '@angular/common'; // 共通ディレクティブを利用する
import {
  ScrollingModule, // 仮想スクロールを提供するモジュール
  CdkVirtualScrollViewport, // 仮想スクロール用のビューポート
} from '@angular/cdk/scrolling';

@Component({ // コンポーネントのメタデータ
  selector: 'app-excel-like', // HTML 上で使うセレクター
  standalone: true, // スタンドアロンコンポーネントとして宣言
  imports: [CommonModule, ScrollingModule], // 使用するモジュール
  templateUrl: './excel-like.component.html', // テンプレートファイル
  styleUrls: ['./excel-like.component.css'], // スタイルファイル
})
/**
 * Excel 風の表を表示するコンポーネント
 */
export class ExcelLikeComponent implements AfterViewInit {
  @ViewChild('viewport') private viewportRef!: CdkVirtualScrollViewport; // 本体のスクロールビューポート
  @ViewChild('headerViewport') // ヘッダー用スクロールビューポート
  private headerViewportRef!: CdkVirtualScrollViewport;
  @ViewChild('verticalScroll') private vScrollRef!: ElementRef<HTMLElement>; // 縦スクロールを司る要素
  @ViewChild('horizontalScrollSync')
  private hScrollSyncRef!: ElementRef<HTMLElement>; // 横スクロール同期用要素

  readonly itemWidth = 180; // 各列の幅
  readonly rowHeight = 44; // 各行の高さ
  readonly headerHeight = 44; // ヘッダー行の高さ
  readonly buffer = 10; // 仮想スクロールのバッファ
  scrollbarGap = 16; // スクロールバーの幅を保持

  readonly items = Array.from({ length: 10_000 }, (_, i) => ({ // 表示するデータ
    id: i, // 行番号
    subDivs: Array.from({ length: 3_000 }, (_, j) => `R${j + 1}-C${i + 1}`), // 各セルの文字列
  }));
  // データを空文字列にしたい場合の例
  // readonly items = Array.from({ length: 10_000 }, (_, i) => ({
  //   id: i,
  //   subDivs: Array.from({ length: 3_000 }, (_, j) => ''),
  // }));

  editingCell: { i: number; j: number } | null = null; // 編集中のセル位置
  selectedCell: { i: number; j: number } | null = null; // 選択中のセル位置

  constructor(private cd: ChangeDetectorRef, private ngZone: NgZone) {} // DI されたサービスを保持

  /**
   * 全体の高さを計算して返す
   */
  get contentHeight(): number {
    return this.items[0]?.subDivs.length * this.rowHeight; // 行数 × 行高さ
  }

  /**
   * 水平方向のスクロール領域の幅を返す
   */
  get totalScrollWidth(): number {
    return this.items.length * this.itemWidth + (this.scrollbarGap || 16); // 列数 × 幅 + スクロールバー幅
  }

  private scrollTop = 0; // 現在の縦スクロール位置

  /**
   * 縦スクロール時に現在位置を保存する
   */
  onVerticalScroll(): void {
    this.scrollTop = this.vScrollRef.nativeElement.scrollTop; // スクロール量を保持
  }

  /**
   * 表示すべき行インデックスを計算して配列で返す
   */
  getVisibleIndexes(): number[] {
    const start = Math.floor(this.scrollTop / this.rowHeight) - this.buffer; // 先頭行の計算
    const end =
      Math.ceil(
        (this.scrollTop + 800 - this.headerHeight - this.scrollbarGap) /
          this.rowHeight
      ) + this.buffer; // 末尾行の計算
    const from = Math.max(0, start); // 0 未満にならないよう調整
    const to = Math.min(this.items[0]?.subDivs.length || 0, end); // 最大値を超えないよう調整
    return Array.from({ length: to - from }, (_, i) => i + from); // 範囲の配列を生成
  }

  /**
   * *ngFor 用の trackBy 関数
   */
  trackByIndex(i: number): number {
    return i; // インデックスをそのまま返す
  }

  /**
   * 数値を Excel の列名(A, B, ... AA) に変換する
   */
  toExcelColumn(index: number): string {
    let col = ''; // 結果を格納する変数
    while (index >= 0) { // 0 以上の間処理
      col = String.fromCharCode((index % 26) + 65) + col; // 26 進数として文字列を組み立て
      index = Math.floor(index / 26) - 1; // 次の桁を計算
    }
    return col; // 列名を返す
  }

  /**
   * 指定セルが編集中かどうか判定する
   */
  isEditingCell(i: number, j: number): boolean {
    return this.editingCell?.i === i && this.editingCell?.j === j; // 編集中セルと一致するか
  }

  /**
   * 指定セルが選択されているか判定する
   */
  isSelectedCell(i: number, j: number): boolean {
    return this.selectedCell?.i === i && this.selectedCell?.j === j; // 選択中セルと一致するか
  }

  /**
   * セルを選択状態にする
   */
  selectCell(i: number, j: number): void {
    this.selectedCell = { i, j }; // 選択中セルを更新
  }

  /**
   * 指定セルの編集を開始する
   */
  startEdit(i: number, j: number): void {
    const maxRow = this.items[0]?.subDivs.length ?? 0; // 行数の最大値
    if (i < 0 || j < 0 || i >= this.items.length || j >= maxRow) {
      return; // 範囲外なら何もしない
    }

    this.editingCell = { i, j }; // 編集中セルを設定
    setTimeout(() => { // 次のタスクで実行
      const inputEl = document.querySelector(
        `input[data-cell-id="${i}-${j}"]`
      ) as HTMLInputElement | null; // 対応する input 要素を取得
      inputEl?.focus(); // フォーカスを合わせる
      inputEl?.select(); // テキストを選択
    });
  }

  /**
   * 入力された値を確定する
   */
  commitEdit(i: number, j: number, value: string): void {
    this.items[i].subDivs[j] = value; // 配列に値を保存
    this.editingCell = null; // 編集状態を解除
  }

  /**
   * セルからフォーカスが外れたときの処理
   */
  onCellBlur(event: FocusEvent, i: number, j: number): void {
    const input = event.target as HTMLInputElement; // 入力要素を取得
    this.commitEdit(i, j, input.value); // 編集内容を確定
  }

  /**
   * Enter キー押下時の処理
   */
  onCellEnter(event: Event, i: number, j: number): void {
    const keyboardEvent = event as KeyboardEvent; // キーボードイベントに変換
    if (keyboardEvent.key === 'Enter') { // Enter キーの場合
      const input = event.target as HTMLInputElement; // 入力要素を取得
      this.commitEdit(i, j, input.value); // 編集内容を確定
    }
  }

  /**
   * 編集をキャンセルする
   */
  cancelEdit(): void {
    this.editingCell = null; // 編集状態を解除
  }

  /**
   * セル編集中のキー操作を処理する
   */
  handleKeydown(event: KeyboardEvent, i: number, j: number): void {
    const input = event.target as HTMLInputElement; // 入力要素を取得
    switch (event.key) { // 押されたキーによって分岐
      case 'Tab':
        event.preventDefault(); // デフォルトのタブ移動を抑止
        this.commitEdit(i, j, input.value); // 編集内容を確定
        this.startEdit(i + 1, j); // 次の列を編集開始
        break;
      case 'ArrowDown':
        event.preventDefault(); // 下矢印のデフォルト動作を抑止
        this.commitEdit(i, j, input.value); // 編集内容を確定
        this.startEdit(i, j + 1); // 次の行を編集開始
        break;
    }
  }

  /**
   * ビュー初期化後の処理を行う
   */
  ngAfterViewInit(): void {
    const mainScroll = this.viewportRef.elementRef.nativeElement; // 本体のスクロール要素
    const headerScroll = this.headerViewportRef.elementRef.nativeElement; // ヘッダーのスクロール要素
    const hSync = this.hScrollSyncRef.nativeElement; // 横スクロール同期要素

    this.ngZone.runOutsideAngular(() => { // ゾーン外でリスナー登録
      mainScroll.addEventListener('scroll', () => { // 本体スクロールに追従
        hSync.scrollLeft = mainScroll.scrollLeft;
        headerScroll.scrollLeft = mainScroll.scrollLeft;
      });

      hSync.addEventListener('scroll', () => { // 同期スクロール時の処理
        mainScroll.scrollLeft = hSync.scrollLeft;
        headerScroll.scrollLeft = hSync.scrollLeft;

        requestAnimationFrame(() => { // スクロール末尾付近で追加処理
          const max = mainScroll.scrollWidth - mainScroll.clientWidth; // 最大スクロール位置
          const diff = Math.abs(mainScroll.scrollLeft - max); // 末尾との差
          if (diff < 80) { // 末尾付近に来たら
            this.viewportRef.scrollToIndex(this.items.length - 1, 'smooth'); // 最終列を表示
            this.viewportRef.checkViewportSize(); // ビューポートサイズ更新
            this.cd.detectChanges(); // 変更検知を発火
          }
        });
      });
    });

    setTimeout(() => { // スクロールバー幅を計算
      const vHost = this.vScrollRef.nativeElement; // 縦スクロール要素を取得
      this.scrollbarGap = vHost.offsetWidth - vHost.clientWidth || 16; // 実際のスクロールバー幅
      this.cd.detectChanges(); // 変更検知
    }, 0);
  }
}
