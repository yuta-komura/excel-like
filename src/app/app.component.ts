import { Component } from '@angular/core'; // Angular の Component クラスを読み込む
import { ExcelLikeComponent } from './excel-like/excel-like.component'; // Excel 風コンポーネントを読み込む
import { ScrollingModule } from '@angular/cdk/scrolling'; // 仮想スクロール用モジュールを読み込む

@Component({ // ここでコンポーネントの設定を行う
  selector: 'app-root', // このコンポーネントを呼び出すセレクター
  standalone: true, // スタンドアロンコンポーネントとして宣言
  imports: [ScrollingModule, ExcelLikeComponent], // 使用するモジュールを指定
  template: `<app-excel-like />`, // テンプレートとして ExcelLike コンポーネントを配置
})
/**
 * アプリのルートコンポーネント
 */
export class AppComponent {} // ルートとなる空のコンポーネント
