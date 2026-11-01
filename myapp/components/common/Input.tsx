import React, { useState } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  touched?: boolean;
}

export default function CustomInput({
  label,
  error,
  touched,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = touched && error;

  return (
    <View className="w-full mb-4">
      {label && (
        <Text className="text-sm font-medium text-stone-700 mb-1.5 ml-1">
          {label}
        </Text>
      )}

      <View
        className={`w-full rounded-3xl border-2 px-4 bg-[#FFFDFB] ${
          hasError
            ? "border-red-400"
            : isFocused
            ? "border-[#CDB8A5]"
            : "border-[#E8DDD3]"
        }`}
      >
        <TextInput
          className="h-14 text-base text-stone-800"
          placeholderTextColor="#B9AEA4"
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </View>

      {hasError && (
        <Text className="text-xs text-red-500 mt-1 ml-2">{error}</Text>
      )}
    </View>
  );
}