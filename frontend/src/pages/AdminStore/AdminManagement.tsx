
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getBrandMembers,
  addBrandMember,
  removeBrandMember,
} from "../../services/ShopAdmin/brandService";
import type { BrandMember } from "../../types/brand";

import AddMemberForm from "../../components/shopadmin/admin/AddMemberForm";
import MemberTable from "../../components/shopadmin/admin/MemberTable";

type MemberRole = "OWNER" | "ADMIN";

export default function AdminManagement() {
  const { slug } = useParams<{ slug: string }>();

  // สมมติว่า route parameter นี้เก็บ slug ของร้าน

  const [members, setMembers] = useState<BrandMember[]>([]);
  const [currentRole, setCurrentRole] = useState<MemberRole>("ADMIN");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMembers = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError("");

      const data = await getBrandMembers(slug);

      setMembers(data.members);
      setCurrentRole(data.currentRole);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load members"
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = async (email: string) => {
    if (!slug) return;

    await addBrandMember(slug, email);
    await fetchMembers();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!slug) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove this member from the store?"
    );

    if (!confirmed) return;

    try {
      await removeBrandMember(slug, memberId);
      await fetchMembers();
    } catch (err: any) {
      alert(
        err.response?.data?.message || "Failed to remove member"
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#332F29]">
            Admin Management
          </h1>

          <p className="text-sm text-[#8B806E] mt-1">
            Manage users who have access to your store.
          </p>
        </div>

        {/* Add Member: OWNER only */}
        {currentRole === "OWNER" && (
          <AddMemberForm onAdd={handleAddMember} />
        )}

        {/* Member Table */}
        {loading ? (
          <div className="bg-white rounded-xl p-10 text-center text-[#8B806E]">
            Loading members...
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>

            <button
              onClick={fetchMembers}
              className="text-blue-700 font-medium hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <MemberTable
            members={members}
            currentRole={currentRole}
            onRemove={handleRemoveMember}
          />
        )}

      </div>
    </div>
  );
}
