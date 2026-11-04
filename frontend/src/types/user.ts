export type Gender = "MALE" | "FEMALE" | "UNSPECIFIED";

export type User = {
    id: string;
    email: string;
    name: string | null;
    gender: Gender | null;
    
}