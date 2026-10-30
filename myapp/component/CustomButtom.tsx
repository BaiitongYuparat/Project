import { Text, TouchableOpacity } from "react-native";

type CustomButtonProp = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
};

export const CustomButton = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
}: CustomButtonProp) => {
  const variantClasses = {
    // สีน้ำตาลเข้ม 
    primary: "bg-[#3E322D] border-2 border-[#3E322D] active:bg-[#2B221E]",
    // ขอบน้ำตาล 
    secondary: "bg-[#FFFDFB] border-2 border-[#3E322D] active:bg-[#F3EBE4]",
    danger: "bg-red-800 border-2 border-red-700 active:bg-red-800",
  };

  const textVariantClasses = {
    primary: "text-white",
    secondary: "text-[#3E322D]",
    danger: "text-white",
  };

  const sizeClasses = {
    sm: "px-3 py-2",
    md: "px-4 py-3",
    lg: "px-6 py-4",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <TouchableOpacity
      className={[
        variantClasses[variant],
        sizeClasses[size],
        "rounded-full items-center justify-center",
        disabled ? "opacity-50" : "",
        className,
      ].join(" ")}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text
        className={[
          "font-bold",
          textVariantClasses[variant],
          textSizeClasses[size],
        ].join(" ")}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};