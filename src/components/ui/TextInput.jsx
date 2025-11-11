import React from "react";

const TextInput = React.forwardRef(
  (
    { label, name, type = "text", placeholder, onChange, onBlur, value },
    ref
  ) => {
    return (
      <div>
        {label && (
          <label className="block mb-1 text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          name={name}
          type={type}
          placeholder={placeholder}
          onChange={onChange}
          onBlur={onBlur}
          value={value}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    );
  }
);

// ✅ must be default export
export default TextInput;
