
import type { BrandMember, BrandMemberRole } from "../../../types/brand";
import Button from "../../Button";

interface MemberTableProps {
  members: BrandMember[];
  currentRole: BrandMemberRole;
  /** id ของ member ที่กำลังอัปเดต role / remove (เพื่อ disable ปุ่ม) */
  pendingMemberId: string | null;
  onRemove: (member: BrandMember) => void;
  onUpdateRole: (member: BrandMember, newRole: BrandMemberRole) => void;
}

export default function MemberTable({
  members,
  currentRole,
  pendingMemberId,
  onRemove,
  onUpdateRole,
}: MemberTableProps) {
  // สิทธิ์แก้ role:
  // - OWNER: แก้ role ได้ทุกแถว (เช่น demote OWNER คนอื่น, backend กันร้านไม่มี OWNER เหลือ)
  // - ADMIN: แก้ได้เฉพาะแถว ADMIN เท่านั้น (ห้ามจัดการ OWNER ทุกกรณี)
  const canEditRole = (member: BrandMember) => {
    if (currentRole === "OWNER") return true;
    return currentRole === "ADMIN" && member.role === "ADMIN";
  };

  // เงื่อนไขเพิ่มเติม: แถวของสมาชิกที่เป็น OWNER **จะไม่มี dropdown เปลี่ยน role**
  // (ใครก็ตาม รวมถึงตัว OWNER เอง เปลี่ยนเป็น ADMIN ไม่ได้ → กัน demote owner)
  // ผู้ที่มีสิทธิ์ (OWNER / ADMIN กับแถว ADMIN) ยังเปลี่ยน role ให้ "แถว ADMIN" ได้เหมือนเดิม
  const canEditRowRole = (member: BrandMember) => {
    if (member.role !== "ADMIN") return false;
    return canEditRole(member);
  };

  // สิทธิ์ลบ: ลบได้เฉพาะแถว ADMIN (ทุกคนห้ามลบ OWNER, OWNER ควรใช้ demote แทน)
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
              const editable = canEditRowRole(member);
              const pending = pendingMemberId === member.id;

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
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          member.role === "OWNER"
                            ? "bg-[#E9DFC9] text-[#332F29]"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {member.role}
                      </span>

                      {editable && (
                        <select
                          value={member.role}
                          disabled={pending}
                          onChange={(e) => {
                            const newRole = e.target.value as BrandMemberRole;
                            if (newRole !== member.role) {
                              onUpdateRole(member, newRole);
                            }
                          }}
                          className="text-xs border border-[#E9DFC9] rounded-md px-2 py-1 text-[#332F29] bg-white focus:outline-none focus:ring-2 focus:ring-[#E9DFC9] disabled:opacity-60 disabled:cursor-not-allowed"
                          aria-label={`เปลี่ยนบทบาทของ ${member.email}`}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="OWNER">OWNER</option>
                        </select>
                      )}
                    </div>
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
                        disabled={pending}
                        onClick={() => onRemove(member)}
                      >
                        {pending ? "กำลังลบ..." : "ลบ"}
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
