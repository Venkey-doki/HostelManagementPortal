import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import { config } from "dotenv";
import { PrismaClient } from "../generated/prisma/client.js";
import { Gender, Role, Semester } from "../generated/prisma/enums.js";

config();

const adapter = new PrismaPg({
	connectionString: `${process.env.DATABASE_URL}`,
});
const prisma = new PrismaClient({ adapter });

async function upsertUser(params: {
	email: string;
	role: Role;
	firstName: string;
	lastName: string;
	phone?: string;
	password: string;
}) {
	const passwordHash = await bcrypt.hash(params.password, 12);

	return prisma.user.upsert({
		where: { email: params.email },
		update: {
			role: params.role,
			firstName: params.firstName,
			lastName: params.lastName,
			phone: params.phone,
			passwordHash,
			isActive: true,
			mustChangePwd: true,
			deletedAt: null,
		},
		create: {
			email: params.email,
			role: params.role,
			firstName: params.firstName,
			lastName: params.lastName,
			phone: params.phone,
			passwordHash,
			isActive: true,
			mustChangePwd: true,
		},
	});
}

async function main() {
	const superAdmin = await upsertUser({
		email: "admin@hostel.local",
		role: Role.SUPER_ADMIN,
		firstName: "Super",
		lastName: "Admin",
		phone: "+910000000001",
		password: "Admin@12345",
	});

	const warden = await upsertUser({
		email: "warden@hostel.local",
		role: Role.WARDEN,
		firstName: "Main",
		lastName: "Warden",
		phone: "+910000000002",
		password: "Warden@12345",
	});

	const incharge = await upsertUser({
		email: "incharge@hostel.local",
		role: Role.MESS_INCHARGE,
		firstName: "Mess",
		lastName: "Incharge",
		phone: "+910000000003",
		password: "Incharge@12345",
	});

	const hostels = [
		{ name: "Boys Hostel 1", gender: Gender.MALE },
		{ name: "Boys Hostel 2", gender: Gender.MALE },
		{ name: "Boys Hostel 3", gender: Gender.MALE },
		{ name: "Boys Hostel 4", gender: Gender.MALE },
		{ name: "Boys Hostel 5", gender: Gender.MALE },
		{ name: "Girls Hostel 1", gender: Gender.FEMALE },
		{ name: "Girls Hostel 2", gender: Gender.FEMALE },
		{ name: "Girls Hostel 3", gender: Gender.FEMALE },
	];

	const hostelRows = await Promise.all(
		hostels.map((hostel) =>
			prisma.hostel.upsert({
				where: { name: hostel.name },
				update: {
					gender: hostel.gender,
					isActive: true,
					deletedAt: null,
				},
				create: {
					name: hostel.name,
					gender: hostel.gender,
					isActive: true,
				},
			}),
		),
	);

	const messes = [
		{ name: "Boys Mess A", gender: Gender.MALE, perDayCharge: "120.00" },
		{ name: "Boys Mess B", gender: Gender.MALE, perDayCharge: "125.00" },
		{ name: "Girls Mess", gender: Gender.FEMALE, perDayCharge: "130.00" },
	];

	const messRows = await Promise.all(
		messes.map((mess) =>
			prisma.mess.upsert({
				where: { name: mess.name },
				update: {
					gender: mess.gender,
					perDayCharge: mess.perDayCharge,
					isActive: true,
					deletedAt: null,
				},
				create: {
					name: mess.name,
					gender: mess.gender,
					perDayCharge: mess.perDayCharge,
					isActive: true,
				},
			}),
		),
	);

	await prisma.inchargeAssignment.upsert({
		where: {
			id: "00000000-0000-0000-0000-000000000001",
		},
		update: {
			userId: incharge.id,
			messId: messRows[0].id,
			isCurrent: true,
			endDate: null,
		},
		create: {
			id: "00000000-0000-0000-0000-000000000001",
			userId: incharge.id,
			messId: messRows[0].id,
			startDate: new Date(),
			isCurrent: true,
		},
	});

	await Promise.all(
		hostelRows.map((hostel) =>
			prisma.hostelRentConfig.upsert({
				where: {
					hostelId_academicYear_semester: {
						hostelId: hostel.id,
						academicYear: "2026-27",
						semester: Semester.FIRST,
					},
				},
				update: {
					amount: "18000.00",
					dueMonth: 7,
					createdById: superAdmin.id,
				},
				create: {
					hostelId: hostel.id,
					academicYear: "2026-27",
					semester: Semester.FIRST,
					amount: "18000.00",
					dueMonth: 7,
					createdById: superAdmin.id,
				},
			}),
		),
	);

	console.log("Seed complete");
	console.log("Super Admin:", superAdmin.email, "password: Admin@12345");
	console.log("Warden:", warden.email, "password: Warden@12345");
	console.log("Mess Incharge:", incharge.email, "password: Incharge@12345");
}

main()
	.catch((error) => {
		console.error("Seed failed", error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
