import { Queue } from "bullmq";
import { env } from "../../config/env.js";

export const bullmqConnection = {
	url: env.REDIS_URL,
};

export const leaveAutoApprovalQueue = new Queue("leave-auto-approval", {
	connection: bullmqConnection,
});

export const billingGenerateQueue = new Queue("billing-generate", {
	connection: bullmqConnection,
});

export async function ensureLeaveAutoApprovalRepeatJobs() {
	await leaveAutoApprovalQueue.add(
		"sweep",
		{},
		{
			repeat: { every: 30 * 60 * 1000 },
			jobId: "leave-auto-approval-30m",
			removeOnComplete: true,
			removeOnFail: 100,
		},
	);

	await leaveAutoApprovalQueue.add(
		"sweep",
		{},
		{
			repeat: { pattern: "45 23 * * *" },
			jobId: "leave-auto-approval-nightly",
			removeOnComplete: true,
			removeOnFail: 100,
		},
	);
}

export async function ensureBillingGenerateRepeatJobs() {
	await billingGenerateQueue.add(
		"generate-monthly-bills",
		{},
		{
			repeat: { pattern: "0 2 1 * *" },
			jobId: "billing-generate-monthly",
			removeOnComplete: true,
			removeOnFail: 100,
		},
	);
}
