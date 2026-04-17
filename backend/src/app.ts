import cors from "cors";
import express from "express";
import helmet from "helmet";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
	res.status(200).json({
		success: true,
		status: "ok",
		service: "hostel-management-backend",
		timestamp: new Date().toISOString(),
	});
});

app.get("/api/v1/health", (_req, res) => {
	res.status(200).json({
		success: true,
		status: "ok",
	});
});
