import {
  ApplicationConfig, // アプリケーションの設定型
  importProvidersFrom, // モジュールをプロバイダとして読み込む関数
  provideZoneChangeDetection, // ゾーン変更検知を提供する関数
} from '@angular/core';
import { provideRouter } from '@angular/router'; // ルーターを提供する関数
import { routes } from './app.routes'; // 定義したルート
import { ScrollingModule } from '@angular/cdk/scrolling'; // スクロール関連モジュール

/**
 * アプリ全体の設定オブジェクト
 */
export const appConfig: ApplicationConfig = {
  providers: [ // 注入するプロバイダー一覧
    provideZoneChangeDetection({ eventCoalescing: true }), // ゾーンの変更検知設定
    provideRouter(routes), // ルーターを設定
    importProvidersFrom(ScrollingModule), // ScrollingModule を読み込む
  ],
};
