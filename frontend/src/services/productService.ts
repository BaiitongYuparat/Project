import api from "./api";

export interface Product {
  id: string;
  shop_id: string;
  shop_name: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
gender?: "WOMEN" | "MEN" | "UNISEX";
  color?: string;
  fit?: string;
}


export const mockProducts: Product[] = [
  {
    id: "product-1",
    shop_id: "shop-1",
    shop_name: "Fashion House",
    name: "เสื้อเชิ้ตลินิน",
    slug: "linen-shirt",
    description: "เสื้อเชิ้ตผ้าลินิน",
    price: 690,
    category: "TOP",
    gender: "UNISEX",
    color: "สีครีม",
    fit: "ทรงสบาย",
  },
  {
    id: "product-2",
    shop_id: "shop-1",
    shop_name: "Fashion House",
    name: "กางเกงขากว้าง",
    slug: "wide-leg-pants",
    description: "กางเกงเอวสูงทรงขากว้าง",
    price: 890,
    category: "BOTTOM",
    gender: "WOMEN",
    color: "สีน้ำตาล",
    fit: "เอวสูง",
  },
  {
    id: "product-3",
    shop_id: "shop-2",
    shop_name: "Daily Wear",
    name: "กระเป๋าสะพายมินิ",
    slug: "mini-shoulder-bag",
    description: "กระเป๋าสะพายใบเล็ก",
    price: 590,
    category: "ACCESSORY",
    gender: "UNISEX",
    color: "สีคาราเมล",
    fit: "หนังวัวแท้",
  },
  {
    id: "product-4",
    shop_id: "shop-3",
    shop_name: "Minimal Store",
    name: "เดรสสายเดี่ยว",
    slug: "minimal-dress",
    description: "เดรสสายเดี่ยวดีไซน์มินิมอล",
    price: 990,
    category: "DRESS",
    gender: "WOMEN",
    color: "สีเบจ",
    fit: "ผ้าคอตตอน",
  },
  {
    id: "product-5",
    shop_id: "shop-2",
    shop_name: "Daily Wear",
    name: "Basic White T-Shirt",
    slug: "basic-white-t-shirt",
    price: 290,
    category: "TOP",
    gender: "UNISEX",
    color: "สีขาว",
    fit: "Regular Fit",
  },
  {
    id: "product-6",
    shop_id: "shop-3",
    shop_name: "Minimal Store",
    name: "กระโปรงยาว",
    slug: "long-skirt",
    price: 750,
    category: "SKIRT",
    gender: "WOMEN",
    color: "สีดำ",
    fit: "ทรง A",
  },
];

const USE_MOCK_DATA = "true";

export const getProducts = async (): Promise<Product[]> => {
  if (USE_MOCK_DATA) {
    return mockProducts;
  }

  const response = await api.get<Product[]>("/products");

  return response.data;
};