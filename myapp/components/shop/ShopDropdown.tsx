import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Modal, Pressable, Text } from "react-native";

import type { Shop } from "../../service/shopService";

type Props = {
  shops: Shop[];
  selectedShop: string;
  onChange: (shopId: string) => void;
};

/** dropdown เลือกร้านค้า (เปิดเป็น modal รายการร้าน) */
export default function ShopDropdown({ shops, selectedShop, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const options = [
    { id: "all", label: "ทุกร้านค้า" },
    ...shops.map((shop) => ({ id: shop.id, label: shop.brand_name })),
  ];

  const selectedLabel =
    options.find((option) => option.id === selectedShop)?.label ?? "ทุกร้านค้า";

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="เลือกร้านค้า"
        className="flex-row items-center rounded-full border border-[#DCC3B3] bg-white px-4 py-2.5 active:opacity-80"
      >
        <Ionicons name="storefront-outline" size={16} color="#7B675A" />
        <Text
          numberOfLines={1}
          className="ml-2 flex-1 text-sm text-[#3B2F2A]"
        >
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#9C8B7E" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1 justify-center bg-black/40 px-6"
        >
          <Pressable
            onPress={() => {}}
            className="max-h-[70%] overflow-hidden rounded-3xl bg-white"
          >
            <Text className="border-b border-[#F0E4D8] px-5 py-4 text-base font-bold text-[#3B2F2A]">
              เลือกร้านค้า
            </Text>

            <FlatList
              data={options}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const active = item.id === selectedShop;

                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                    className={`flex-row items-center justify-between px-5 py-3.5 active:bg-[#F8F1EA] ${
                      active ? "bg-[#F8F1EA]" : ""
                    }`}
                  >
                    <Text
                      className={`flex-1 text-sm ${
                        active
                          ? "font-semibold text-[#3B2F2A]"
                          : "text-[#3B2F2A]"
                      }`}
                    >
                      {item.label}
                    </Text>
                    {active && (
                      <Ionicons name="checkmark" size={18} color="#3B2F2A" />
                    )}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
