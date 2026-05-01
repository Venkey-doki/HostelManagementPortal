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

async function upsertStudent(params: {
	email: string;
	firstName: string;
	lastName: string;
	phone: string;
	password: string;
	rollNumber: string;
	gender: Gender;
	department: string;
	academicYear: number;
	batch: string;
}) {
	const user = await upsertUser({
		email: params.email,
		role: Role.STUDENT,
		firstName: params.firstName,
		lastName: params.lastName,
		phone: params.phone,
		password: params.password,
	});

	return prisma.student.upsert({
		where: { userId: user.id },
		update: {
			rollNumber: params.rollNumber,
			gender: params.gender,
			department: params.department,
			academicYear: params.academicYear,
			batch: params.batch,
			isActive: true,
			deletedAt: null,
		},
		create: {
			userId: user.id,
			rollNumber: params.rollNumber,
			gender: params.gender,
			department: params.department,
			academicYear: params.academicYear,
			batch: params.batch,
			isActive: true,
		},
	});
}

async function main() {
	const office = await upsertUser({
		email: "office@hostel.local",
		role: Role.OFFICE,
		firstName: "Master",
		lastName: "Office",
		phone: "+910000000001",
		password: "Office@12345",
	});

	const incharge = await upsertUser({
		email: "incharge@hostel.local",
		role: Role.MESS_INCHARGE,
		firstName: "Mess",
		lastName: "Incharge",
		phone: "+910000000003",
		password: "Incharge@12345",
	});

	const students = await Promise.all([
		upsertStudent({
			email: "student1@hostel.local",
			firstName: "Aarav",
			lastName: "Sharma",
			phone: "+910000000101",
			password: "Student@12345",
			rollNumber: "2026CS001",
			gender: Gender.MALE,
			department: "Computer Science",
			academicYear: 1,
			batch: "2026-30",
		}),
		upsertStudent({
			email: "student2@hostel.local",
			firstName: "Ishita",
			lastName: "Verma",
			phone: "+910000000102",
			password: "Student@12345",
			rollNumber: "2026CS002",
			gender: Gender.FEMALE,
			department: "Computer Science",
			academicYear: 1,
			batch: "2026-30",
		}),
		upsertStudent({
			email: "student3@hostel.local",
			firstName: "Rohan",
			lastName: "Patel",
			phone: "+910000000103",
			password: "Student@12345",
			rollNumber: "2026EC001",
			gender: Gender.MALE,
			department: "Electronics",
			academicYear: 2,
			batch: "2025-29",
		}),
		upsertStudent({
			email: "student4@hostel.local",
			firstName: "Meera",
			lastName: "Nair",
			phone: "+910000000104",
			password: "Student@12345",
			rollNumber: "2026EC002",
			gender: Gender.FEMALE,
			department: "Electronics",
			academicYear: 2,
			batch: "2025-29",
		}),
		upsertStudent({
			email: "student5@hostel.local",
			firstName: "Kabir",
			lastName: "Singh",
			phone: "+910000000105",
			password: "Student@12345",
			rollNumber: "2026ME001",
			gender: Gender.MALE,
			department: "Mechanical",
			academicYear: 3,
			batch: "2024-28",
		}),
		upsertStudent({
			email: "student6@hostel.local",
			firstName: "Ananya",
			lastName: "Iyer",
			phone: "+910000000106",
			password: "Student@12345",
			rollNumber: "2026ME002",
			gender: Gender.FEMALE,
			department: "Mechanical",
			academicYear: 3,
			batch: "2024-28",
		}),
		upsertStudent({
			email: "student7@hostel.local",
			firstName: "Vikram",
			lastName: "Reddy",
			phone: "+910000000107",
			password: "Student@12345",
			rollNumber: "2026CE001",
			gender: Gender.MALE,
			department: "Civil",
			academicYear: 4,
			batch: "2023-27",
		}),
		upsertStudent({
			email: "student8@hostel.local",
			firstName: "Sana",
			lastName: "Khan",
			phone: "+910000000108",
			password: "Student@12345",
			rollNumber: "2026CE002",
			gender: Gender.FEMALE,
			department: "Civil",
			academicYear: 4,
			batch: "2023-27",
		}),
		upsertStudent({
			email: "student9@hostel.local",
			firstName: "Arjun",
			lastName: "Menon",
			phone: "+910000000109",
			password: "Student@12345",
			rollNumber: "2026EE001",
			gender: Gender.MALE,
			department: "Electrical",
			academicYear: 2,
			batch: "2025-29",
		}),
		upsertStudent({
			email: "student10@hostel.local",
			firstName: "Priya",
			lastName: "Das",
			phone: "+910000000110",
			password: "Student@12345",
			rollNumber: "2026EE002",
			gender: Gender.FEMALE,
			department: "Electrical",
			academicYear: 2,
			batch: "2025-29",
		}),
	]);

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
		hostelRows.map((hostel: { id: string }) =>
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
					createdById: office.id,
				},
				create: {
					hostelId: hostel.id,
					academicYear: "2026-27",
					semester: Semester.FIRST,
					amount: "18000.00",
					dueMonth: 7,
					createdById: office.id,
				},
			}),
		),
	);

	console.log("Seed complete");
	console.log("Master Office:", office.email, "password: Office@12345");
	console.log("Mess Incharge:", incharge.email, "password: Incharge@12345");
	console.log("Students seeded:", students.length);
}

main()
	.catch((error) => {
		console.error("Seed failed", error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
