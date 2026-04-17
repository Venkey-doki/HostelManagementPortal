import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./infrastructure/database/prisma.js";

const server = app.listen(env.PORT, () => {
	console.log(`Backend API running on port ${env.PORT}`);
});

async function shutdown(signal: NodeJS.Signals) {
	console.log(`Received ${signal}. Closing server...`);
	server.close(async () => {
		await prisma.$disconnect();
		process.exit(0);
	});
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
