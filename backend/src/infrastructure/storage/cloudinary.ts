import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";

// Configure Cloudinary only if credentials are present (v1: falls back to local upload)
if (
	env.CLOUDINARY_CLOUD_NAME &&
	env.CLOUDINARY_API_KEY &&
	env.CLOUDINARY_API_SECRET
) {
	cloudinary.config({
		cloud_name: env.CLOUDINARY_CLOUD_NAME,
		api_key: env.CLOUDINARY_API_KEY,
		api_secret: env.CLOUDINARY_API_SECRET,
		secure: true,
	});
}

const localUploadDir = path.resolve(process.cwd(), "uploads", "payments");
const localPublicBaseUrl =
	env.BACKEND_PUBLIC_URL ?? `http://localhost:${env.PORT}`;

function inferFileExtension(mimeType: string): string {
	if (mimeType.includes("png")) {
		return "png";
	}
	if (mimeType.includes("webp")) {
		return "webp";
	}
	if (mimeType.includes("gif")) {
		return "gif";
	}
	return "jpg";
}

async function saveScreenshotLocally(input: {
	buffer: Buffer;
	mimeType: string;
	studentId: string;
	billId?: string;
}): Promise<string> {
	await mkdir(localUploadDir, { recursive: true });
	const fileExtension = inferFileExtension(input.mimeType);
	const fileName = input.billId
		? `${input.studentId}-${input.billId}-${Date.now()}-${randomUUID()}.${fileExtension}`
		: `${input.studentId}-advance-${Date.now()}-${randomUUID()}.${fileExtension}`;
	const absolutePath = path.join(localUploadDir, fileName);
	await writeFile(absolutePath, input.buffer);
	return `${localPublicBaseUrl}/uploads/payments/${fileName}`;
}

export async function uploadPaymentScreenshot(input: {
	buffer: Buffer;
	mimeType: string;
	studentId: string;
	billId?: string;
}): Promise<string> {
	return new Promise((resolve, reject) => {
		const uploadOptions: {
			folder: string;
			resource_type: "image";
			public_id: string;
			format?: "png";
			timeout?: number;
		} = {
			folder: "hostel-management/payments",
			resource_type: "image",
			public_id: input.billId
				? `${input.studentId}-${input.billId}-${Date.now()}`
				: `${input.studentId}-advance-${Date.now()}`,
			timeout: 15_000,
		};

		if (input.mimeType.includes("png")) {
			uploadOptions.format = "png";
		}

		const upload = cloudinary.uploader.upload_stream(
			uploadOptions,
			async (error, result) => {
				if (error || !result) {
					try {
						const localUrl = await saveScreenshotLocally(input);
						resolve(localUrl);
					} catch (localError) {
						reject(localError);
					}
					return;
				}

				resolve(result.secure_url);
			},
		);

		upload.end(input.buffer);
	});
}
