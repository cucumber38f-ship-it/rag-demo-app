-- 拡張機能をインスト
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- テーブルを作成
CREATE TABLE IF NOT EXISTS book_list (
	id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	title TEXT NOT NULL,
	author TEXT,
	genre TEXT[] DEFAULT '{}' NOT NULL,
	price INTEGER,
	source_book_id TEXT UNIQUE
);
