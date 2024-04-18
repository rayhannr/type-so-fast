import React, { HTMLProps } from "react";

const Input: React.FC<HTMLProps<HTMLInputElement>> = (props) => {
  return (
    <div className="w-64 sm:w-72 xl:w-96">
      <input
        className={`w-full border border-solid ${
          props.disabled
            ? "bg-gray-100 cursor-not-allowed border-gray-400"
            : "bg-white cursor-text border-blue-400"
        } text-gray-900 font-medium md:text-lg p-3 rounded-md focus:outline-none focus:ring-1`}
        type="text"
        {...props}
      />
    </div>
  );
};

export default Input;
