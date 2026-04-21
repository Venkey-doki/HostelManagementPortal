import { Outlet } from "react-router-dom";

export default function AuthLayout() {
	return (
		<div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
			<div className="sm:mx-auto sm:w-full sm:max-w-md">
				{/* Institution branding */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-700 mb-4">
						<svg
							className="w-8 h-8 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
							/>
						</svg>
					</div>
					<h1 className="text-2xl font-bold text-slate-900">
						Hostel Management Portal
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Institutional hostel &amp; mess administration system
					</p>
				</div>
				<Outlet />
			</div>
		</div>
	);
}
