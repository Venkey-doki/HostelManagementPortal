import { Worker } from "bullmq";
import { env } from "../../../config/env.js";
import { leavesService } from "../../../modules/leaves/leaves.service.js";
import { prisma } from "../../database/prisma.js";
import {
	bullmqConnection,
	ensureLeaveAutoApprovalRepeatJobs,
	leaveAutoApprovalQueue,
} from "../queues.js";

export async function startLeaveAutoApprovalWorker() {
	await prisma.$queryRaw`SELECT 1`;
	await ensureLeaveAutoApprovalRepeatJobs();

	const worker = new Worker(
		leaveAutoApprovalQueue.name,
		async (job) => {
			if (job.name !== "sweep") {
				return { success: true, processed: 0 };
			}

			return leavesService.autoApproveDueLeaves(new Date());
		},
		{
			connection: bullmqConnection,
			concurrency: 1,
		},
	);

	worker.on("completed", (job) => {
		console.log(`Leave auto-approval job completed: ${job.id}`);
	});

	worker.on("failed", (job, error) => {
		console.error(
			`Leave auto-approval job failed: ${job?.id ?? "unknown"}`,
			error,
		);
	});

	await worker.waitUntilReady();
	console.log(`Leave auto-approval worker ready on ${env.REDIS_URL}`);

	return worker;
}
