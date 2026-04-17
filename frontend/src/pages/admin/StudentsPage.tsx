import { api } from "@/lib/api";
import { useEffect, useState } from "react";

interface Student {
	id: string;
	rollNumber: string;
	gender: "MALE" | "FEMALE";
	user: {
		firstName: string;
		lastName: string;
		email: string;
	};
}

export default function StudentsPage() {
	const [students, setStudents] = useState<Student[]>([]);
	const [search, setSearch] = useState("");

	const load = async (searchText = "") => {
		const response = await api.get("/students", {
			params: {
				page: 1,
				limit: 50,
				...(searchText ? { search: searchText } : {}),
			},
		});
		setStudents(response.data.data);
	};

	useEffect(() => {
		void load();
	}, []);

	const onSearch = async (e: React.FormEvent) => {
		e.preventDefault();
		await load(search);
	};

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-3xl font-bold">Students</h1>
			<form onSubmit={onSearch} className="flex gap-2 max-w-xl">
				<input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="flex-1 border rounded px-3 py-2"
					placeholder="Search by roll number, name, or email"
				/>
				<button
					className="bg-black text-white rounded px-4 py-2"
					type="submit"
				>
					Search
				</button>
			</form>

			<div className="border rounded-md overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-gray-100 text-left">
						<tr>
							<th className="p-3">Roll</th>
							<th className="p-3">Name</th>
							<th className="p-3">Email</th>
							<th className="p-3">Gender</th>
						</tr>
					</thead>
					<tbody>
						{students.map((student) => (
							<tr key={student.id} className="border-t">
								<td className="p-3">{student.rollNumber}</td>
								<td className="p-3">
									{student.user.firstName}{" "}
									{student.user.lastName}
								</td>
								<td className="p-3">{student.user.email}</td>
								<td className="p-3">{student.gender}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
