import "dotenv/config";
import express from "express";
import { apiRouter } from "./routes/apiRoutes.js";

const app = express();
const port: number = Number(process.env.PORT) || 3000;

// REVIEW: `SyntaxError: Expected ':' after property name in JSON...` はここでリクエストボディをJSON解析するときに出ます。
// apiRoutes.ts の処理に入る前のエラーなので、原因はルート実装ではなくcurlの `-d` に渡したJSON文字列の構文ミスです。
app.use(express.json());
app.use("/", apiRouter);

app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
});
