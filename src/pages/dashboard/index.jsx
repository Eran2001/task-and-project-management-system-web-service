import React from "react";
import { useNavigate } from "react-router-dom";

const index = () => {
  const navigate = useNavigate;
  return (
    <div>
      <h1>Dashboard</h1>
      <button
        type="button"
        className="py-2 px-4 bg-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
        onClick={() => navigate("/register")}
      >
        Register
      </button>
    </div>
  );
};

export default index;
