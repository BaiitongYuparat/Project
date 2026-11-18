import type { BrandMember } from "../../../types/brand";
import Button from "../../Button";

interface MemberTableProps {
  members: BrandMember[];
  onRemove: (member: BrandMember) => void;
}

export default function MemberTable({
  members,
  onRemove,
}: MemberTableProps) {
  // สิทธิ์ลบ: ลบได้เฉพาะแถว ADMIN (ทุกคนห้ามลบ OWNER — การเปลี่ยน OWNER ต้องยื่นคำขอไปยัง Super Admin)
  const canRemoveMember = (member: BrandMember) => {
    return member.role !== "OWNER";
  };

  return (
    <div className="bg-white rounded-xl border border-[#E9DFC9] overflow-hidden">
      <div className="p-5 border-b border-[#E9DFC9]">
        <h3 className="text-lg font-semibold text-[#332F29]">
          สมาชิกของร้าน
        </h3>
        <p className="text-sm text-[#8B806E] mt-1">
          มีสมาชิก {members.length} คนที่เข้าถึงร้านนี้ได้
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#FAF7F0] text-[#8B806E]">
            <tr>
              <th className="px-5 py-3 font-medium">สมาชิก</th>
              <th className="px-5 py-3 font-medium">บทบาท</th>
              <th className="px-5 py-3 font-medium">วันที่เข้าร่วม</th>
              <th className="px-5 py-3 font-medium text-right">
                จัดการ
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E9DFC9]">
            {members.map((member) => {
              const manageable = canRemoveMember(member);

              return (
                <tr key={member.id} className="hover:bg-[#FAF7F0]/60">
                  <td className="px-5 py-4">
                    <p className="font-medium text-[#332F29]">
                      {member.name || "ผู้ใช้ที่ไม่ระบุชื่อ"}
                    </p>
                    <p className="text-[#8B806E] text-xs mt-1">
                      {member.email}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    {/* [REQ] ไม่มีการเปลี่ยน role ในหน้านี้แล้ว — ห้าม promote เป็น OWNER ทุกกรณี
                        การเปลี่ยน OWNER ต้องยื่นคำขอไปยัง Super Admin เท่านั้น */}
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

                  <td className="px-5 py-4 text-right">
                    {manageable && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => onRemove(member)}
                      >
                        ลบ
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}

            {members.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-10 text-center text-[#8B806E]"
                >
                  ไม่พบสมาชิก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
