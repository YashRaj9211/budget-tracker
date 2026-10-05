import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import BudgetSettings from "./pages/Budget";
import App from "./App";
import Split from "./pages/Split";
import Friends from "./pages/Friends";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const router = createBrowserRouter([
	{
		Component: App,
		children: [
			{
				path: "/login",
				Component: Auth,
			},
			{
				path: "/auth",
				Component: Auth,
			},
			{
				path: "/signup",
				Component: Auth,
			},
			{
				path: "/logo-demo",
				lazy: async () => ({ Component: (await import("./pages/LogoDemo")).default }),
			},
			{
				Component: ProtectedRoute,
				children: [
					{
						path: "/",
						Component: Home,
					},
					{
						path: "/hub",
						// Chart pages load on demand so the charting library is not in the first download
						lazy: async () => ({ Component: (await import("./pages/HubDashboard")).default }),
					},
					{
						path: "/budget",
						Component: BudgetSettings,
					},
					{
						path: "/stats",
						lazy: async () => ({ Component: (await import("./pages/Stats")).default }),
					},
					{
						path: "/split",
						Component: Split,
					},
					{
						path: "/friends",
						Component: Friends,
					},
					{
						path: "/profile",
						Component: Profile,
					},
				],
			},
		],
	},
]);

export default router;
