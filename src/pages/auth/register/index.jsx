// src/pages/UserRegistration.jsx
import React, { useState } from "react";
import Select from "react-select";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import API from "@/services";
import TextInput from "@/components/TextInput";

const roleOptions = [
  { value: "customer", label: "Customer" },
  { value: "seller", label: "Seller" },
  { value: "admin", label: "Admin" },
];

const UserRegistration = () => {
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: null,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (selected) => {
    setForm({ ...form, role: selected });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!form.username || !form.password || !form.role) {
      toast.error("Please fill all fields!");
      return;
    }

    try {
      const response = await API.private.onboarding_userRegister({
        username: form.username,
        password: form.password,
        role: form.role.value,
      });

      toast.success("Registration successful!");
      console.log("✅ Response:", response);
      setForm({ username: "", password: "", role: null });
    } catch (error) {
      console.error(error);
      toast.error("Registration failed!");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleRegister}
        className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md"
      >
        <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">
          User Registration
        </h2>

        <TextInput
          label="Username"
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Enter your username"
        />

        <TextInput
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Enter your password"
        />

        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium text-gray-700">
            Role
          </label>
          <Select
            options={roleOptions}
            value={form.role}
            onChange={handleRoleChange}
            placeholder="Select role..."
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
        >
          Register
        </button>
      </form>

      <ToastContainer position="top-right" autoClose={2500} hideProgressBar />
    </div>
  );
};

export default UserRegistration;
