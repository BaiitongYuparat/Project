
import { useState } from "react";
import Button from "../../Button";
import Input from "../../Input";

interface AddMemberFormProps {
  onAdd: (email: string) => Promise<void>;
}

export default function AddMemberForm({ onAdd }: AddMemberFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await onAdd(email.trim());
      setEmail("");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to add member"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-[#E9DFC9] p-5"
    >
      <h3 className="text-lg font-semibold text-[#332F29] mb-1">
        Add New Member
      </h3>

      <p className="text-sm text-[#8B806E] mb-4">
        Add an existing LongDress user to manage this store.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <div className="flex-1 w-full">
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter member email"
            required
          />
        </div>

        <div className="sm:pt-6">
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? "Adding..." : "+ Add Member"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </form>
  );
}
