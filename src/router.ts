import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import BudgetSettings from "./pages/Budget";


const router = createBrowserRouter([
    {
        path: "/",
        Component: Home
    },
    {
        path:'/budget',
        Component: BudgetSettings
    }
]);

export default router