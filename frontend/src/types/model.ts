export type Gender = "MALE" | "FEMALE" | "UNSPECIFIED"

export type Model = {
  id: string;
  name: string;
  gender: Gender | null;
  body_type: string;
  height: string; 
  image_url: string;
  supported_sizes: string[];
  is_active: boolean;
  is_selectable: boolean;
  created_at: string;
};