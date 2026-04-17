import { api } from "@/lib/api";
import { useState } from "react";

export default function ImportPage() {
	const [file, setFile] = useState<File | null>(null);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!file) {
			setError("Please select a CSV file");
			return;
		}

		setLoading(true);
		setError("");
		setMessage("");

		try {
			const formData = new FormData();
			formData.append("file", file);

			const response = await api.post(
				"/admin/students/import",
				formData,
				{
					headers: { "Content-Type": "multipart/form-data" },
				},
			);

			setMessage(
				`Imported ${response.data.data.imported} students successfully.`,
			);
		} catch (err: any) {
			setError(err.response?.data?.error?.message ?? "Import failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-3xl font-bold">Import Students</h1>
			<p className="text-gray-600 text-sm">
				CSV headers: roll_number, first_name, last_name, email, gender,
				department, academic_year, batch
			</p>

			<form
				onSubmit={onSubmit}
				className="space-y-3 border rounded-md p-4 max-w-xl"
			>
				<input
					type="file"
					accept=".csv"
					onChange={(e) => setFile(e.target.files?.[0] ?? null)}
				/>
				<button
					type="submit"
					disabled={loading}
					className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
				>
					{loading ? "Importing..." : "Import CSV"}
				</button>
				{message && <p className="text-green-700 text-sm">{message}</p>}
				{error && <p className="text-red-700 text-sm">{error}</p>}
			</form>
		</div>
	);
}
