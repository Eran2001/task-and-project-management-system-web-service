import React from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-semibold mb-4">Dashboard</h1>

      <button
        type="button"
        className="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
        onClick={() => navigate("/register")}
      >
        Go to Register
      </button>
    </div>
  );
};

export default Dashboard;
