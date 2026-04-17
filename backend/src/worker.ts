import { env } from "./config/env.js";
import { prisma } from "./infrastructure/database/prisma.js";

async function bootstrapWorker() {
	console.log("Worker process started");
	console.log(`REDIS_URL configured: ${Boolean(env.REDIS_URL)}`);

	await prisma.$queryRaw`SELECT 1`;
	console.log("Database connectivity check passed");
}

void bootstrapWorker().catch(async (error) => {
	console.error("Worker bootstrap failed", error);
	await prisma.$disconnect();
	process.exit(1);
});

process.on("SIGINT", async () => {
	await prisma.$disconnect();
	process.exit(0);
});

process.on("SIGTERM", async () => {
	await prisma.$disconnect();
	process.exit(0);
});
