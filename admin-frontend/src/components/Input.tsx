import {
  useId,
  type InputHTMLAttributes,
  type ReactNode
} from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & { //ดึง props ของ input มาใช้
  label: string;
  error?: string;
  hint?: string;
  suffix?: ReactNode;
};

export default function Input({
  label,
  error,
  hint,
  suffix,
  id,
  className = "",
  ...rest 
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-msg`;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1 block text-md font-medium text-gray-700 text-left"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error || hint ? messageId : undefined}
          className={`w-full rounded-lg border-2 px-4 py-2.5 outline-none focus:ring-2 disabled:bg-gray-100
            ${
              error
                ? "text-red-500 border-red-500 focus:border-red-500 focus:ring-red-100"
                : "text-secondary border-primary focus:border-secondary focus:ring-primary"
            }
            ${suffix ? "pr-14" : ""} ${className}`}
          {...rest}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            {suffix}
          </span>
        )}
      </div>

      {(error || hint) && (
        <p
          id={messageId}
          className={`mt-1 text-sm ${error ? "text-red-600" : "text-gray-500"}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}