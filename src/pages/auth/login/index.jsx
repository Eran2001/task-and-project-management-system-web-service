import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

import TextInput from "@/components/ui/TextInput";
import Notification from "@/components/ui/Notification";
import API from "@/services";
import token from "@/lib/utilities";

const schema = yup.object().shape({
  username: yup.string().required("Username is required"),
  password: yup
    .string()
    .min(4, "Password must be at least 4 characters")
    .required("Password is required"),
});

const UserLogin = () => {
  const {
    handleSubmit,
    reset,
    register,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      const payload = {
        username: data.username,
        password: data.password,
      };

      const response = await API.private.onboarding_userLogin(payload);
      if (response.data.code === "OK") {
        Notification.success("Login successful!");

        const { token: jwtToken, user } = response.data.data.result;
        console.log(response.data.data.result);
        token.setAuthToken(jwtToken);
        token.setUserData(user);
      } else {
        Notification.error("Login failed!");
      }
      reset();
    } catch (error) {
      if (error.response.data.code) {
        Notification.error(error.response.data.message);
      } else if (error.response.data.code === "NOT_FOUND") {
        Notification.error(error.response.data.message);
      } else if (error.response.data.code === "UNAUTHORIZED") {
        Notification.error(error.response.data.message);
      } else {
        Notification.error("Server error!");
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md"
      >
        <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">
          User Login
        </h2>

        {/* Username Field */}
        <div className="mb-4">
          <TextInput
            label="Username"
            placeholder="Enter your username"
            {...register("username")}
          />
          {errors.username && (
            <p className="text-red-500 text-sm mt-1">
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="mb-4">
          <TextInput
            label="Password"
            type="password"
            placeholder="Enter your password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition cursor-pointer disabled:opacity-60"
        >
          {isSubmitting ? "Logging..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default UserLogin;
