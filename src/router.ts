import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import BudgetSettings from "./pages/Budget";
import Stats from "./pages/Stats";
import App from "./App";


const router = createBrowserRouter([
    {
        Component: App,
        children: [
            {
                path: "/",
                Component: Home
            },
            {
                path: '/budget',
                Component: BudgetSettings
            },
            {
                path: '/stats',
                Component: Stats
            }
        ]
    },
]);

export default router