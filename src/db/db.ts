import pg from "pg";
const { Pool } = pg;
import "dotenv/config";
import { randomUUID } from "node:crypto";

import type { Book } from "../types/Book.js";
import type { Restaurant } from "../types/Restaurant.js";
import type { ReadStream } from "node:fs";

type NewBook = Omit<Book, "id">;
type NewRestaurant = Omit<Restaurant, "id">;
type AmazonOrderRow = Record<string, string>;

// 環境変数
const DATABASE_URL = process.env.DATABASE_URL;

// 例外チェック
if (!DATABASE_URL) {
	throw new Error("環境変数DATABASE_URLが見つかりません");
}

// DBへ接続を確立
const pool = new Pool({
	connectionString: DATABASE_URL,
});


/**
 * GET /book-listで内部的に呼びだされ、DBから本一覧を取得する
 * @param limit 最大取得数
 * @returns 本の一覧
 */
export async function getBookList(limit: number): Promise<Book[]> {
	const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 10;
	const result = await pool.query<Book>(`
		SELECT 
			id,
			title,
			author,
			genre,
			price,
			source_book_id AS isbn
		FROM book_list
		LIMIT $1
		`,[
			safeLimit,
		]);

	return result.rows;
}

/**
 * GET /restaurant-listで内部的に呼びだされ、DBから訪問済み飲食店一覧を取得する
 * @param limit 最大取得数
 * @returns 訪問済み飲食店
 */
export async function getRestaurantList(limit: number): Promise<Restaurant[]> {
	const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 10;
	const result = await pool.query(`
		SELECT
			id,
			store_name,
			visited_on,
			place,
			tag,
			min_price,
			max_price,
			has_toilet,
			memo
		FROM 
			restaurant_reviews
		LIMIT $1
		`,[
			safeLimit
		]);

		return result.rows;
}

function getBookId(): string {
	return `bk_${randomUUID().slice(0, 10)}`;
}

/**
 * 書籍をテーブルに追加する
 * @param book 追加する書籍情報
 */
export async function addBookRecord(book: NewBook): Promise<void> {

	const { title, genre, author, price } = book;

	await pool.query(`
			INSERT INTO book_list (
				title,
				author,
				genre,
				price,
				source_book_id
		)
		VALUES (
			$1, $2, $3, $4, $5
		)
		`,[
			title,
			author,
			genre,
			price,
			getBookId(),
		]);
}


/**
 * 飲食店をテーブルに追加する
 * @param restaurant 追加する飲食店
 */
export async function addRestaurantRecord(restaurant: NewRestaurant): Promise<void> {

	const { name, visitedOn, place, tag, minPrice, maxPrice, hasToilet, memo } = restaurant;

	await pool.query(`
		INSERT INTO restaurant_reviews (
			store_name,
			visited_on,
			place,
			tag,
			min_price,
			max_price,
			has_toilet,
			memo
		)
		VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8
		)
		`,[
			name,
			visitedOn,
			place,
			tag,
			minPrice,
			maxPrice,
			hasToilet,
			memo,
		]);
}

/**
 * IDで指定した書籍をテーブルから抽出する
 * @param id 書籍のID 
 * @returns 書籍
 */
export async function getBookById(id: string): Promise<Book | undefined> {
	const result = await pool.query<Book>(`
		SELECT
			id,
			title,
			author,
			genre,
			price
		FROM 
			book_list
		WHERE
			id = $1
		`,[
			id
		]);

	return result.rows[0];
}

/**
 * 特定のテーブル行について、書籍情報を更新する
 * @param id 該当行を指すID
 * @param newBook 追加する書籍
 */
export async function updateBookRecord(newBook: Book): Promise<void> {

	const { id, title, author, genre, price } = newBook;

		await pool.query(`
			UPDATE book_list
			SET 
				-- REVIEW: UPDATE の SET 句では各カラム代入の間にカンマが必要です。
				-- カンマがないと title=$2 author=$3 のように解釈され、syntax error at or near "author" になります。
				title=$2,
				author=$3,
				genre=$4,
				price=$5
			WHERE
				id=$1
		`,[
			id,
			title,
			author,
			genre,
			price,
		]);
}


/**
 * 指定したidのレコードをテーブルから抽出する
 * @param id 飲食店のid
 * @returns 飲食店のレコード
 */
export async function getRestaurantById(id: string): Promise<Restaurant | undefined> {
	const result = await pool.query<Restaurant>(`
		SELECT
			-- REVIEW: isDifferent は同じ型・同じキー名のオブジェクト同士を比較します。
			-- DBの snake_case のまま返すと newRestaurant の camelCase とキーが合わず、同じ内容でも差分ありになります。
			id,
			store_name AS name,
			-- REVIEW: node-postgres は timestamp/date を Date として返す場合があります。
			-- PUT のリクエストボディは文字列なので、同じ日付でも Date !== string になり isDifferent が差分ありと判定します。
			-- 比較しやすいようにDB側で YYYY-MM-DD 文字列へ揃えます。
			to_char(visited_on, 'YYYY-MM-DD') AS "visitedOn",
			place,
			tag,
			-- REVIEW: DB側の型が numeric の場合、node-postgres は文字列で返すことがあります。
			-- curl のJSONは number なので、同じ値でも "4" !== 4 となり isDifferent が差分ありと判定します。
			min_price::float8 AS "minPrice",
			max_price::float8 AS "maxPrice",
			rating_score::float8 AS "ratingScore",
			has_toilet AS "hasToilet",
			memo
		FROM 
			restaurant_reviews
		WHERE 
			id=$1
		`,[
			id,
		]);

	return result.rows[0];
}


/**
 * 指定
 * @param restaurant 更新する飲食店
 */
export async function updateRestaurantRecord(restaurant: Restaurant): Promise<void> {

	const { id, name, place, tag, minPrice, maxPrice, hasToilet, ratingScore, memo, visitedOn } = restaurant;
	await pool.query(`
		UPDATE 
			restaurant_reviews
		SET
			store_name=$2,
			visited_on=$3,
			place=$4,
			tag=$5,
			min_price=$6,
			max_price=$7,
			has_toilet=$8,
			rating_score=$9,
			memo=$10			
		WHERE 
			id=$1
		`,[
			id, name, visitedOn, place, tag,
			minPrice, maxPrice, hasToilet, ratingScore, memo
		]);
}

/**
 * 指定したidのレコードを削除する
 * @param id 削除するレコードのid
 */
export async function deleteBookRecord(id: string): Promise<void> {
	await pool.query(`
		DELETE
		FROM
			book_list
		WHERE 
			id=$1
		`,[
			id,
		]);
}

/**
 * 指定したidのレコードを削除する
 * @param id 削除するレコードのid
 */
export async function deleteRestaurantRecord(id: string): Promise<void> {
	await pool.query(`
		DELETE
		FROM
			restaurant_reviews
		WHERE 
			id=$1
		`,[
			id,
		]);
}