-- 拡張機能をインスト
-- REVIEW: pgcrypto の UUID 生成関数名は `gen_random_uuid()` です。
-- `get_random_uuid()` という関数はないため、pgcrypto が存在していても `function get_random_uuid() does not exist` になります。
-- もし権限エラーが出る場合は、接続ユーザーに拡張機能を作成する権限がない可能性があります。
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- テーブルを作成
CREATE TABLE IF NOT EXISTS book_list (
	id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	title TEXT NOT NULL,
	-- REVIEW: Amazon CSV には著者カラムがないため、今の db.ts では author は常に NULL になります。
	-- 将来APIや別データソースから著者を入れる予定がないなら、いったん不要なカラムかもしれません。
	author TEXT,
	-- REVIEW: db.ts は `genre_original` をカンマ分割し、さらに `primary_domain` を追加して TEXT[] に入れているので、この型は合っています。
	-- ただしジャンル検索をよくするなら、あとで GIN インデックスを検討するとよいです。
	genre TEXT[] DEFAULT '{}' NOT NULL,
	-- REVIEW: Amazon CSV の `paid_price` は整数円なので INTEGER で問題ありません。
	-- 税込/外貨/小数を扱う可能性があるなら NUMERIC にする選択肢もあります。
	price INTEGER,
	-- REVIEW: UNIQUE 制約があるため、同じISBNのダミーデータを複数INSERTすると duplicate key エラーになります。
	-- ダミーデータで同じISBNを使い回すなら UNIQUE を外すか、INSERT側で毎回別のISBNにしてください。
	-- REVIEW: 現在の db.ts は CSV の `book_id` をこの `isbn` カラムに入れています。
	-- 実ISBNではないので、カラム名を `source_book_id` などに変える方が意味は正確です。
	source_book_id TEXT UNIQUE
);
