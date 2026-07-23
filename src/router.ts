import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import BudgetSettings from "./pages/Budget";
import Stats from "./pages/Stats";
import App from "./App";
import Split from "./pages/Split";
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
				],
			},
		],
	},
]);

export default router;