import { Router } from "express";
import { 
	getBookList,
	getRestaurantList,
	addBookRecord,
	addRestaurantRecord,
	getBookById,
	updateBookRecord,
	getRestaurantById,
	updateRestaurantRecord,
	deleteBookRecord,
	deleteRestaurantRecord,
} from "../db/db.js";
import type { Restaurant } from "../types/Restaurant.js";
import type { Book } from "../types/Book.js";

type NewBook = Omit<Book, "id">;
type NewRestaurant = Omit<Restaurant, "id">;
type ToiletStatus = Restaurant["hasToilet"];

const toiletList = [
	"あり（詳細不明）",
	"あり（男女兼用・洋式のみ）",
	"あり（男女別・洋式のみ）",
	"あり（男女別・和式のみ）",
	"あり（男女別・和洋）",
	"なし",
	"不明",
] as const satisfies readonly ToiletStatus[];

function isToiletStatus(value: unknown): value is ToiletStatus {
	return typeof value === "string" && toiletList.includes(value as ToiletStatus);
}

export const apiRouter = Router();

// GET /health
apiRouter.get("/health", (_req, res) => {
	res.status(200)
	.json({
		status: "ok",
	});
});

// GET /books
apiRouter.get("/books", async (req, res, next) => {
	try {

		console.log(req.query);

		const limit = Number(req.query.limit);
		const books = await getBookList(limit);

		res.status(200)
		.json({
			books,
		});
	} catch (error) {
		next(error);
	}
});

// GET /restaurants
apiRouter.get("/restaurants", async (req, res, next) => {
	try {

		console.log(req.query);

		const limit = Number(req.query.limit);
		const restaurants: Restaurant[] = await getRestaurantList(limit);

		res.status(200)
		.json({
			restaurants,
		});
	} catch (error) {
		next(error);
	}
});

// POST /books
apiRouter.post("/books", async (req, res, next) => {
	const { title, author, genre, price } = req.body;

	// 例外処理
	if (!title || typeof title !== "string") {
		return res.status(400).json({
			error: "title must be string",
		});
	} else if (!Array.isArray(genre) || !genre.every((item) => typeof item === "string")) {
		return res.status(400).json({
			error: "genre must be string array",
		});	
	} else if (typeof price !== "number" || isNaN(price)) {
		return res.status(400).json({
			error: "price must be integer.",
		});
	}

	const book: NewBook = {
		title,
		author,
		genre,
		price,
	};

	try {
		await addBookRecord(book);

		res.status(201).json({
			status: "ok",
			message: "successfully added new book to database!",
			book,
		});
	} catch (error) {
		next(error);
	}
		
});

// POST /restaurants
apiRouter.post("/restaurants", async (req, res, next) => {

	const { name, visitedOn, place, tag, minPrice, maxPrice, ratingScore, hasToilet, memo } = req.body;

	// 例外処理
	if (!name || typeof name !== "string") {
		return res.status(400).json({
			error: "name must be string",
		});
	} else if (typeof visitedOn !== "string") {
		return res.status(400).json({
			error: "visitedOn must be string",
		});
	} else if (typeof place !== "string") {
		return res.status(400).json({
			error: "place must be string",
		});
	} else if (!Array.isArray(tag) || !tag.every((ele) => typeof ele === "string")) {
		return res.status(400).json({
			error: "tag must be string array.",
		});
	} else if (typeof minPrice !== "number" || isNaN(minPrice)) {
		return res.status(400).json({
			error: "minPrice must be integer.",
		});
	} else if (typeof maxPrice !== "number" || isNaN(maxPrice)) {
		return res.status(400).json({
			error: "maxPrice must be integer.",
		});
	} else if (typeof ratingScore !== "number") {
		return res.status(400).json({
			error: "ratingScore must be numeric.",
		});		
	} else if (!isToiletStatus(hasToilet)) {
		return res.status(400).json({
			error: "hasToilet must be string and designated value.",
		});
	} else if (!memo || typeof memo !== "string") {
		return res.status(400).json({
			error: "memo must be string.",
		});
	}

	const restaurant: NewRestaurant = {
		name,
		visitedOn,
		place,
		tag,
		minPrice,
		maxPrice,
		ratingScore,
		hasToilet,
		memo,
	};

	try {
		await addRestaurantRecord(restaurant);
		
		res.status(201).json({
			status: "ok",
			message: "successfully added new restaurant to database!",
			restaurant,
		});
	} catch (error) {
		next(error);
	}
});


function isDifferent<T extends object>(oldItem: T, newItem: T): boolean {

	// REVIEW: ジェネリクスは `function name<T>(arg: T)` の形で宣言します。
	// これで Book 同士、Restaurant 同士のように「同じ型の2つ」を比較できます。
	for (const key in oldItem) {

		const typedKey = key as keyof T;
		if (!(typedKey in newItem)) {
			return true;
		}

		const oldValue = oldItem[typedKey];
		const newValue = newItem[typedKey];

		// REVIEW: genre のような配列は `!==` だと参照比較になるため、中身が同じでも別物扱いになります。
		// ここでは配列同士だけ長さと要素を比較し、同じなら次のキーへ進めます。
		if (Array.isArray(oldValue) || Array.isArray(newValue)) {
			if (!Array.isArray(oldValue) || !Array.isArray(newValue)) {
				return true;
			}

			if (oldValue.length !== newValue.length) {
				return true;
			}

			if (oldValue.some((value, index) => value !== newValue[index])) {
				return true;
			}

			continue;
		}

		// REVIEW: title / author / price / id / isbn など、配列以外の値はここで通常比較します。
		// これで genre 以外の変更も差分として検知できます。
		if (oldValue !== newValue) {
			return true;
		}
	}

	return false;
}
 
// PUT /books/:id
apiRouter.put("/books/:id", async (req, res, next) => {
	const id = req.params.id;
	const { title, author, genre, price } = req.body;

	if (!id || typeof id !== "string") {
		return res.status(400).json({
			error: "id must be string and is required.",
		});
	} else if (!title || typeof title !== "string") {
		return res.status(400).json({
			error: "title must be string",
		});
	} else if (!Array.isArray(genre) || !genre.every((item) => typeof item === "string")) {
		return res.status(400).json({
			error: "genre must be string array",
		});	
	} else if (typeof price !== "number" || isNaN(price)) {
		return res.status(400).json({
			error: "price must be integer.",
		});
	}

	try {
		const oldBook = await getBookById(id);

		if (!oldBook) {
			return res.status(404).json({
				error: `there's no book that matches id: ${id}.`,
			});
		}

		const newBook: Book = {
			id,
			title,
			author,
			genre,
			price,
		};

		if (!isDifferent(oldBook, newBook)) {
			// falseの場合ここ
			return res.status(400).json({
				error: "old book and new one is utterly same.",
			});
		}

		await updateBookRecord(newBook);

		res.status(200).json({
			status: "ok",
			message: `successfully updated id: ${id}!`,
			newBook,
		});
	} catch (error) {
		next(error);
	}
});


// PUT /restaurants/:id
apiRouter.put("/restaurants/:id", async (req, res, next) => {

	const id: string = req.params.id;

	if (!id || typeof id !== "string") {
		return res.status(400).json({
			error: "id must be string.",
		});
	}

	const { name, place, tag, minPrice, maxPrice, hasToilet, ratingScore, memo, visitedOn } = req.body;

	// 例外処理
	if (!name || typeof name !== "string") {
		return res.status(400).json({
			error: "name must be string.",
		});
	} else if (typeof place !== "string") {
		return res.status(400).json({
			error: "place must be string.",
		});		
	} else if (!tag || !Array.isArray(tag) || !tag.every(ele => typeof ele === "string")) {
		return res.status(400).json({
			error: "tag must be string array.",
		});		
	} else if (typeof minPrice !== "number") {
		return res.status(400).json({
			error: "minPrice must be integer.",
		});		
	} else if (typeof maxPrice !== "number") {
		return res.status(400).json({
			error: "maxPrice must be string.",
		});		
	} else if (!isToiletStatus(hasToilet)) {
		return res.status(400).json({
			error: "hasToilet must be string and designated value.",
		});			
	} else if (typeof ratingScore !== "number") {
		return res.status(400).json({
			error: "ratingScore must be numeric.",
		});			
	} else if (!memo || typeof memo !== "string") {
		return res.status(400).json({
			error: "memo must be string.",
		});			
	}

	try {
		const oldRestaurant = await getRestaurantById(id);

		if (!oldRestaurant) {
			return res.status(404).json({
				error: `there's no restaurant that matches id: ${id}.`,
			});
		}

		const newRestaurant: Restaurant = {
			id,
			name,
			place,
			tag,
			minPrice,
			maxPrice,
			hasToilet,
			ratingScore,
			memo,
			visitedOn,
		};

		if (!isDifferent(oldRestaurant, newRestaurant)) {
			return res.status(400).json({
				error: "old book and new one is utterly same.",
			});
		}

		await updateRestaurantRecord(newRestaurant);

		res.status(200).json({
			status: "ok",
			message: `successfully updated id: ${id}!`,
			newRestaurant,
		});
	} catch (error) {
		next(error);
	}
});


// DELETE /books/:id
apiRouter.delete("/books/:id", async (req, res, next) => {
	const id: string | undefined = req.params.id;

	if (!id || typeof id !== "string") {
		return res.status(400).json({
			error: "id must be string and is required.",
		});
	}

	try {
		// 存在チェック
		const book: Book | undefined = await getBookById(id);

		if (!book) {
			return res.status(404).json({
				error: `${id} does not exist.`,
			});
		}

		// 存在する場合だけ削除
		await deleteBookRecord(id);

		res.status(200).json({
			status: "ok",
			message: `successfully deleted id: ${id}!`,
			book,
		});
	} catch (error) {
		next(error);
	}	
});

// DELETE restaurants/:id
apiRouter.delete("/restaurants/:id", async (req, res, next) => {
	const id: string | undefined = req.params.id;

	if (!id || typeof id !== "string") {
		return res.status(400).json({
			error: "id must be string.",
		});
	}

	try {
		// 存在チェック
		const restaurant: Restaurant | undefined = await getRestaurantById(id);

		if (!restaurant) {
			return res.status(404).json({
				error: `${id} does not exit.`,
			});
		}

		await deleteRestaurantRecord(id);

		res.status(200).json({
			status: "ok",
			message: `successfully deleted id: ${id}`,
			restaurant,
		});
	} catch (error) {
		next(error);
	}
});