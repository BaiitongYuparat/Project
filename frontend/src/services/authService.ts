
const API_URL = import.meta.env.VITE_API_URL;

export type GoogleAuthResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

export async function loginWithGoogle(
  idToken: string
): Promise<GoogleAuthResponse> {
  const response = await fetch(`${API_URL}/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Google Login failed");
  }

  return data as GoogleAuthResponse;
}
