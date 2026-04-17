import { prisma } from "../../infrastructure/database/prisma.js";

export class MessesService {
	async listActiveMesses() {
		return prisma.mess.findMany({
			where: { isActive: true, deletedAt: null },
			orderBy: { name: "asc" },
		});
	}
}

export const messesService = new MessesService();
