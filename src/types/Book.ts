export type Book = {
	id: string;
	title: string;
	genre: string[];
	author?: string | null;
	price?: number;
	isbn?: string;
};