import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import BudgetSettings from "./pages/Budget";
import Stats from "./pages/Stats";
import App from "./App";
import Split from "./pages/Split";
import Friends from "./pages/Friends";
import HubDashboard from "./pages/HubDashboard";
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
				Component: ProtectedRoute,
				children: [
					{
						path: "/",
						Component: Home,
					},
					{
						path: "/hub",
						Component: HubDashboard,
					},
					{
						path: "/budget",
						Component: BudgetSettings,
					},
					{
						path: "/stats",
						Component: Stats,
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