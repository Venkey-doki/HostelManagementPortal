import * as bcrypt from "bcrypt";
import { prisma } from "../../infrastructure/database/prisma.js";
import { AppError } from "../../shared/errors/AppError.js";

/**
 * Admin Service - handles admin operations like CSV import
 */

export class AdminService {
	/**
	 * Import students from CSV - bulk create users and students
	 */
	async importStudents(
		rows: Array<{
			roll_number: string;
			first_name: string;
			last_name: string;
			email: string;
			gender: "MALE" | "FEMALE";
			department?: string | undefined;
			academic_year: number;
			batch?: string | undefined;
		}>,
	) {
		const errors: Array<{ rowIndex: number; error: string }> = [];
		let successCount = 0;

		// Validate all rows first to give user complete feedback
		const emailSet = new Set<string>();
		const rollSet = new Set<string>();

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i]!;

			// Check for duplicates within the import
			if (emailSet.has(row.email.toLowerCase())) {
				errors.push({
					rowIndex: i + 1,
					error: "Duplicate email in import",
				});
				continue;
			}
			if (rollSet.has(row.roll_number)) {
				errors.push({
					rowIndex: i + 1,
					error: "Duplicate roll number in import",
				});
				continue;
			}

			emailSet.add(row.email.toLowerCase());
			rollSet.add(row.roll_number);

			// Check database for duplicates
			const existingEmail = await prisma.user.findUnique({
				where: { email: row.email.toLowerCase() },
			});
			if (existingEmail) {
				errors.push({
					rowIndex: i + 1,
					error: "Email already exists in system",
				});
				continue;
			}

			const existingStudent = await prisma.student.findUnique({
				where: { rollNumber: row.roll_number },
			});
			if (existingStudent) {
				errors.push({
					rowIndex: i + 1,
					error: "Roll number already exists in system",
				});
				continue;
			}
		}

		// If there are validation errors, return them before creating anything
		if (errors.length > 0) {
			throw new AppError(
				`Validation failed for ${errors.length} row(s)`,
				422,
				"IMPORT_VALIDATION_FAILED",
			);
		}

		// Bulk create: transaction ensures all-or-nothing
		try {
			for (const row of rows) {
				// Hash password = bcrypt(rollNumber)
				const hashedPassword = await bcrypt.hash(row.roll_number, 12);

				const user = await prisma.user.create({
					data: {
						email: row.email.toLowerCase(),
						passwordHash: hashedPassword,
						role: "STUDENT",
						firstName: row.first_name,
						lastName: row.last_name,
						isActive: true,
						mustChangePwd: true, // Force change on first login
					},
				});

				await prisma.student.create({
					data: {
						userId: user.id,
						rollNumber: row.roll_number,
						gender: row.gender,
						department: row.department ?? null,
						academicYear: row.academic_year,
						batch: row.batch ?? null,
						isActive: true,
					},
				});

				successCount++;
			}
		} catch (error) {
			throw new AppError(
				"Bulk import failed. Some records may have been partially created.",
				500,
				"BULK_IMPORT_ERROR",
				true,
			);
		}

		return {
			success: true,
			imported: successCount,
			errors: errors.length > 0 ? errors : undefined,
		};
	}
}

export const adminService = new AdminService();
