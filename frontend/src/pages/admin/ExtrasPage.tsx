import { api } from "@/lib/api";
import { useEffect, useMemo, useState, type FormEvent } from "react";

interface Mess {
	id: string;
	name: string;
	gender: "MALE" | "FEMALE";
	perDayCharge: string;
	isActive: boolean;
}

interface ExtraItem {
	id: string;
	name: string;
	unit: string;
	price: string;
	isActive: boolean;
}

export default function AdminExtrasPage() {
	const [messes, setMesses] = useState<Mess[]>([]);
	const [selectedMessId, setSelectedMessId] = useState("");
	const [items, setItems] = useState<ExtraItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [itemsLoading, setItemsLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [form, setForm] = useState({ name: "", unit: "cup", price: "0" });

	const loadMesses = async () => {
		setLoading(true);
		setError("");
		try {
			const response = await api.get("/admin/messes");
			setMesses(response.data.data);
			setSelectedMessId(
				(current) => current || response.data.data[0]?.id || "",
			);
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to load messes",
			);
		} finally {
			setLoading(false);
		}
	};

	const loadItems = async (messId: string) => {
		if (!messId) {
			setItems([]);
			return;
		}

		setItemsLoading(true);
		setError("");
		try {
			const response = await api.get(`/messes/${messId}/extras`);
			setItems(response.data.data.items);
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to load extras",
			);
		} finally {
			setItemsLoading(false);
		}
	};

	useEffect(() => {
		void loadMesses();
	}, []);

	useEffect(() => {
		if (selectedMessId) {
			void loadItems(selectedMessId);
		}
	}, [selectedMessId]);

	const selectedMess = useMemo(
		() => messes.find((mess) => mess.id === selectedMessId) ?? null,
		[messes, selectedMessId],
	);

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!selectedMessId) {
			setError("Select a mess first");
			return;
		}

		setError("");
		setSuccess("");
		try {
			await api.post(`/messes/${selectedMessId}/extras`, {
				name: form.name,
				unit: form.unit,
				price: Number(form.price),
			});
			setForm({ name: "", unit: "cup", price: "0" });
			setSuccess("Extra item created successfully.");
			await loadItems(selectedMessId);
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to create extra item",
			);
		}
	};

	const totalPrice = useMemo(
		() => items.reduce((sum, item) => sum + Number(item.price), 0),
		[items],
	);

	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Step 6</p>
					<h1>Extras configuration</h1>
					<p>
						Configure mess-level chargeable extras before incharge
						staff add them to student bills.
					</p>
				</div>
				<div className="portal-actions">
					<span className="portal-pill accent">
						{messes.length} messes
					</span>
					<span className="portal-pill">{items.length} extras</span>
				</div>
			</section>

			{error ? <div className="portal-alert error">{error}</div> : null}
			{success ? (
				<div className="portal-alert success">{success}</div>
			) : null}

			<div className="portal-grid two">
				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Mess menu</p>
							<h2>Select mess</h2>
						</div>
					</div>
					<label className="portal-form-label">
						Mess
						<select
							className="portal-input"
							value={selectedMessId}
							onChange={(event) =>
								setSelectedMessId(event.target.value)
							}
						>
							{messes.map((mess) => (
								<option key={mess.id} value={mess.id}>
									{mess.name} ({mess.gender})
								</option>
							))}
						</select>
					</label>
					<p className="portal-helper" style={{ marginTop: "8px" }}>
						{selectedMess
							? `${selectedMess.name} currently costs ₹${selectedMess.perDayCharge}/day.`
							: "Loading messes..."}
					</p>
				</div>

				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Create item</p>
							<h2>New extra</h2>
						</div>
					</div>
					<form onSubmit={onSubmit} className="portal-grid two">
						<label className="portal-form-label">
							Item name
							<input
								className="portal-input"
								value={form.name}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										name: event.target.value,
									}))
								}
								placeholder="Chicken curry"
							/>
						</label>
						<label className="portal-form-label">
							Unit
							<input
								className="portal-input"
								value={form.unit}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										unit: event.target.value,
									}))
								}
								placeholder="cup"
							/>
						</label>
						<label className="portal-form-label">
							Price
							<input
								className="portal-input"
								type="number"
								min="0"
								step="0.01"
								value={form.price}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										price: event.target.value,
									}))
								}
							/>
						</label>
						<div style={{ alignSelf: "end" }}>
							<button
								className="portal-button portal-button-primary"
								type="submit"
								disabled={loading || !selectedMessId}
							>
								Create extra
							</button>
						</div>
					</form>
				</div>
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Configured extras</p>
						<h2>{selectedMess?.name ?? "Mess"} items</h2>
					</div>
					<div className="portal-actions">
						{itemsLoading ? (
							<span className="portal-pill">Loading</span>
						) : null}
						<span className="portal-pill">
							Total rate base ₹{totalPrice.toFixed(2)}
						</span>
					</div>
				</div>

				<div className="portal-table-wrap">
					<table className="portal-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Unit</th>
								<th>Price</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item) => (
								<tr key={item.id}>
									<td>{item.name}</td>
									<td>{item.unit}</td>
									<td>₹{Number(item.price).toFixed(2)}</td>
									<td>
										{item.isActive ? "Active" : "Inactive"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{!items.length ? (
					<div className="portal-empty">
						No extras configured for this mess yet.
					</div>
				) : null}
			</div>
		</div>
	);
}
