import { Worker } from "bullmq";
import { env } from "../../../config/env.js";
import { billingService } from "../../../modules/billing/billing.service.js";
import { prisma } from "../../database/prisma.js";
import {
	billingGenerateQueue,
	bullmqConnection,
	ensureBillingGenerateRepeatJobs,
} from "../queues.js";

export async function startBillingGenerateWorker() {
	await prisma.$queryRaw`SELECT 1`;
	await ensureBillingGenerateRepeatJobs();

	const worker = new Worker(
		billingGenerateQueue.name,
		async (job) => {
			if (job.name !== "generate-monthly-bills") {
				return { success: true, processedCount: 0 };
			}

			return billingService.generatePreviousMonthBills(new Date());
		},
		{
			connection: bullmqConnection,
			concurrency: 1,
		},
	);

	worker.on("completed", (job) => {
		console.log(`Billing generation job completed: ${job.id}`);
	});

	worker.on("failed", (job, error) => {
		console.error(
			`Billing generation job failed: ${job?.id ?? "unknown"}`,
			error,
		);
	});

	await worker.waitUntilReady();
	console.log(`Billing generation worker ready on ${env.REDIS_URL}`);

	return worker;
}
