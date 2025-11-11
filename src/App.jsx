import { RouterProvider } from "react-router-dom";
import { Suspense } from "react";
import { ToastContainer } from "react-toastify";

import { router } from "./routes/index";

function App() {
  return (
    <>
      <Suspense fallback={<div className="text-center">Loading...</div>}>
        <RouterProvider router={router} />
      </Suspense>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={false}
        draggable={false}
        pauseOnHover={true}
        theme="colored"
      />
    </>
  );
}

export default App;
