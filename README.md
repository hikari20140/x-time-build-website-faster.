# x-time-build-website-faster

Vite代替を目指した、フルスタック開発向けの最小基盤です。

## 現在の機能

- `xtime dev`
  - フロントの静的配信 (`app/client`)
  - APIルーティング (`app/server/routes.js`)
  - SSEベースのライブリロード
- `xtime build`
  - `app/client` / `app/server` を `dist` に出力
- `xtime start`
  - `dist` から本番サーバー起動

## 使い方

```bash
npm install
npm run dev
```

本番相当:

```bash
npm run build
npm run start
```

ブラウザで `http://localhost:5173` を開きます。

## ルート定義

`app/server/routes.js`:

```js
export const routes = [
  {
    method: "GET",
    path: "/api/hello",
    handler: (ctx) => {
      ctx.sendJson(200, { message: "hello" });
    }
  }
];
```

## 次の拡張候補

- モジュール変換（esbuild/Rollup/SWC連携）
- 本格HMR
- SSRエントリ
- プラグインフック拡張
