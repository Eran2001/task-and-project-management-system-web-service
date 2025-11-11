import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

const UserRegistration = lazy(() => import("../pages/auth/register"));
const Dashboard = lazy(() => import("@/pages/dashboard"));

export const router = createBrowserRouter([
  {
    path: "/",
    // element: <MainLayout />,
    // errorElement: <ErrorPage />,
    children: [
      //   { path: "*", element: <NotFound /> },
      { index: true, element: <Dashboard /> },
      { path: "register", element: <UserRegistration /> },
    ],
  },
]);
