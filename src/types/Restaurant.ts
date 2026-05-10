export type Restaurant = {
	id: string;
	name: string;
	visitedOn: string | null;
	place: string | null;
	tag: string[];
	minPrice: number | null;
	maxPrice: number | null;
	ratingScore: number | null;
	hasToilet: "あり（詳細不明）"
	| "あり（男女兼用・洋式のみ）"
	| "あり（男女別・洋式のみ）"
	| "あり（男女別・和式のみ）"
	| "あり（男女別・和洋）"
	| "なし"
	| "不明";
	memo: string;
};