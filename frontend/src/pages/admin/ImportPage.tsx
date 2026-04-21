import { api } from "@/lib/api";
import { useState } from "react";

export default function ImportPage() {
	const [file, setFile] = useState<File | null>(null);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!file) { setError("Please select a CSV file"); return; }
		setLoading(true); setError(""); setMessage("");
		try {
			const formData = new FormData();
			formData.append("file", file);
			const res = await api.post("/admin/students/import", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			setMessage(`Imported ${res.data.data.imported} students successfully.`);
		} catch (err: any) { setError(err.response?.data?.error?.message ?? "Import failed"); }
		finally { setLoading(false); }
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-bold text-slate-900">CSV Import</h1>
				<p className="mt-0.5 text-sm text-slate-500">
					Bulk-onboard students from a CSV file with auto-generated passwords.
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-4">Upload CSV</h2>
					{error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}
					{message && <div className="mb-3 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700">{message}</div>}
					<form onSubmit={onSubmit} className="space-y-4">
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">CSV file</label>
							<input
								type="file"
								accept=".csv"
								onChange={(e) => setFile(e.target.files?.[0] ?? null)}
								className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<button
							type="submit"
							disabled={loading || !file}
							className="w-full py-2.5 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors"
						>
							{loading ? "Importing…" : "Import students"}
						</button>
					</form>
				</div>

				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-3">CSV Format</h2>
					<p className="text-xs text-slate-500 mb-3">Required column headers (in order):</p>
					<div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
						<code className="text-xs text-slate-700 font-mono leading-relaxed">
							roll_number, first_name, last_name, email, gender, department, academic_year, batch
						</code>
					</div>
					<ul className="mt-4 space-y-1.5">
						{[
							"gender must be MALE or FEMALE",
							"email must be unique across all users",
							"Passwords are auto-generated and must be changed on first login",
							"Existing roll numbers will be skipped",
						].map((tip) => (
							<li key={tip} className="flex items-start gap-2 text-xs text-slate-500">
								<span className="text-slate-300 mt-0.5">•</span>
								{tip}
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	);
}
