/*
REVIEW: このファイルは .ts なので、curl コマンドをそのまま書くと TypeScript として解釈されて構文エラーになります。
メモとして残すなら、このようにコメントブロック内へ入れるか、README.md などに移すのが安全です。

REVIEW: PUT /books/:id を叩きたい場合、curl は `-X POST` ではなく `-X PUT` にする必要があります。
今の apiRoutes.ts では POST /books は新規作成、PUT /books/:id は更新です。

REVIEW: 実際のURLでは `:id` のコロンは書きません。
Express の `/books/:id` はルート定義上のプレースホルダなので、curl では `/books/f7b7ec3a-f4bb-4667-8110-0bdab7964833` のように送ります。

REVIEW: JSON の `"author"; "テスト太郎"` は `;` ではなく `:` が必要です。
ここが壊れていると express.json() がリクエストボディをパースできず、JSON parse error になります。
今回の `Expected ':' after property name in JSON at position 38 (line 3 column 10)` はこのケースです。
line 3 の `"author"` の直後に `:` が来るべきところで、`;` や別の文字が来ているため JSON.parse が失敗しています。

curl -X PUT https://api.unneko.dev/books/f7b7ec3a-f4bb-4667-8110-0bdab7964833 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新しくしましたテスト",
    "author": "テスト太郎",
    "genre": [
      "高級焼肉",
      "テスト書籍"
    ],
    "price": 100000
  }'
*/
