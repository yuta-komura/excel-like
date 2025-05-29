import { ComponentFixture, TestBed } from '@angular/core/testing'; // テストユーティリティの読み込み

import { ExcelLikeComponent } from './excel-like.component'; // テスト対象のコンポーネント

describe('ExcelLikeComponent のテスト', () => { // ExcelLikeComponent の挙動確認
  let component: ExcelLikeComponent; // テスト対象のインスタンス
  let fixture: ComponentFixture<ExcelLikeComponent>; // テスト用フィクスチャ

  beforeEach(async () => { // 各テスト前の初期化
    await TestBed.configureTestingModule({ // テストモジュールを設定
      imports: [ExcelLikeComponent], // テスト対象をモジュールに登録
    }).compileComponents(); // コンパイル

    fixture = TestBed.createComponent(ExcelLikeComponent); // フィクスチャを生成
    component = fixture.componentInstance; // インスタンスを取得
    fixture.detectChanges(); // 初期変更検知
  });

  it('コンポーネントが生成されることを確認', () => { // インスタンス生成の確認
    expect(component).toBeTruthy(); // インスタンスが存在することを期待
  });
});
