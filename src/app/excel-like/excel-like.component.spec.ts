import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExcelLikeComponent } from './excel-like.component';

describe('ExcelLikeComponent', () => {
  let component: ExcelLikeComponent;
  let fixture: ComponentFixture<ExcelLikeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExcelLikeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExcelLikeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
