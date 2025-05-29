import { bootstrapApplication } from '@angular/platform-browser'; // アプリを起動する関数
import { AppComponent } from './app/app.component'; // ルートコンポーネント

// アプリケーションを起動し、エラーがあればコンソールに表示
bootstrapApplication(AppComponent).catch((err) => console.error(err));
