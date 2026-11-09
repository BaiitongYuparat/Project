
import type { BrandMember } from "../../../types/brand";
import Button from "../../Button";

interface MemberTableProps {
  members: BrandMember[];
  currentRole: "OWNER" | "ADMIN";
  onRemove: (memberId: string) => void;
}

export default function MemberTable({
  members,
  currentRole,
  onRemove,
}: MemberTableProps) {
  const isOwner = currentRole === "OWNER";

  return (
    <div className="bg-white rounded-xl border border-[#E9DFC9] overflow-hidden">
      <div className="p-5 border-b border-[#E9DFC9]">
        <h3 className="text-lg font-semibold text-[#332F29]">
          Store Members
        </h3>
        <p className="text-sm text-[#8B806E] mt-1">
          {members.length} members have access to this store.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#FAF7F0] text-[#8B806E]">
            <tr>
              <th className="px-5 py-3 font-medium">Member</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Joined Date</th>
              {isOwner && (
                <th className="px-5 py-3 font-medium text-right">
                  Action
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E9DFC9]">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-[#FAF7F0]/60">
                <td className="px-5 py-4">
                  <p className="font-medium text-[#332F29]">
                    {member.name || "Unnamed User"}
                  </p>
                  <p className="text-[#8B806E] text-xs mt-1">
                    {member.email}
                  </p>
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      member.role === "OWNER"
                        ? "bg-[#E9DFC9] text-[#332F29]"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {member.role}
                  </span>
                </td>

                <td className="px-5 py-4 text-[#8B806E]">
                  {new Date(member.created_at).toLocaleDateString()}
                </td>

                {isOwner && (
                  <td className="px-5 py-4 text-right">
                    {member.role !== "OWNER" && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => onRemove(member.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}

            {members.length === 0 && (
              <tr>
                <td
                  colSpan={isOwner ? 4 : 3}
                  className="px-5 py-10 text-center text-[#8B806E]"
                >
                  No members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
