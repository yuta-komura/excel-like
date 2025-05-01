import { Component } from '@angular/core';
import { ExcelLikeComponent } from './excel-like/excel-like.component';
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ScrollingModule, ExcelLikeComponent],
  template: `<app-excel-like />`,
})
export class AppComponent {}
