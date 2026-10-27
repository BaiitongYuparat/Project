const API_URL = import.meta.env.VITE_API_URL;
export type User = {
    id: string;
    email: string;
    name: string | null;
}

export function getUser() {

}