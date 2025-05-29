import { TestBed } from '@angular/core/testing'; // テストユーティリティを読み込む
import { AppComponent } from './app.component'; // テスト対象のコンポーネントを読み込む

describe('AppComponent のテスト', () => { // AppComponent の動作を確認する
  beforeEach(async () => { // 各テストの前に実行する処理
    await TestBed.configureTestingModule({ // テスト用のモジュールを設定
      imports: [AppComponent], // テスト対象のコンポーネントを読み込む
    }).compileComponents(); // コンポーネントをコンパイル
  });

  it('アプリが生成されることを確認', () => { // インスタンスが作成されるか確認
    const fixture = TestBed.createComponent(AppComponent); // コンポーネントの作成
    const app = fixture.componentInstance; // インスタンスを取得
    expect(app).toBeTruthy(); // インスタンスが存在することを期待
  });

  it('ExcelLike コンポーネントが表示されることを確認', () => { // 子コンポーネントの描画を確認
    const fixture = TestBed.createComponent(AppComponent); // コンポーネントの作成
    fixture.detectChanges(); // 変更検知を実行
    const compiled = fixture.nativeElement as HTMLElement; // DOM を取得
    expect(compiled.querySelector('app-excel-like')).not.toBeNull(); // ExcelLike コンポーネントが存在することを期待
  });
});
