import { NavLink, Outlet } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import {
  bodyOutline,
  cameraOutline,
  chevronForwardOutline,
} from "ionicons/icons";

export default function ProfilePage() {
  const menuItems = [
    {
      name: "ข้อมูลสัดส่วน",
      path: "BodyPage",
    },
    {
      name: "รูปภาพของฉัน",
      path: "UploadBodyImg",
    },
  ];

  return (
    <div className="w-full min-h-screen px-3 ">
      <div className="py-5 ">
        <p className="font-bold text-2xl text-secondary">รู้จักรูปร่างของคุณ</p>
        <p>ข้อมูลของคุณช่วยให้ AI เลือกทรงและสัดส่วนได้ใกล้เคียงขึ้น</p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        
        {/* Sidebar */}
        <aside className="w-full shrink-0 md:w-1/4">
          <div className="overflow-hidden rounded-2xl border border-[#E5DED2] bg-[#FFFEFB] shadow-sm">
            {/* Header */}
            <div className="bg-[#F0E9DD] px-5 py-6">

              <h2 className="text-lg font-bold text-[#5F5144]">
                เริ่มจากตัวคุณ
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-[#928474]">
                กรอกข้อมูลสัดส่วนและเพิ่มรูปภาพรูปร่างของคุณ
                เพื่อให้ระบบแนะนำเสื้อผ้าที่เหมาะสม
              </p>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 p-3">
              {menuItems.map((item, index) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-[#E8EDE4] text-[#68775E]"
                        : "text-[#928474] hover:bg-[#F7F4EE] hover:text-[#5F5144]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <IonIcon
                          icon={index === 0 ? bodyOutline : cameraOutline}
                          className={`text-xl ${
                            isActive ? "text-[#75866B]" : "text-[#B3A797]"
                          }`}
                        />

                        <span>{item.name}</span>
                      </div>

                      <IonIcon
                        icon={chevronForwardOutline}
                        className={`text-base transition-transform ${
                          isActive
                            ? "translate-x-0.5 text-[#75866B]"
                            : "text-[#C4B9AA] group-hover:translate-x-0.5"
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Footer */}
            <div className="mx-4 mb-4 rounded-xl bg-[#F5F2EA] p-3">
              <p className="text-xs leading-relaxed text-[#928474]">
                <span className="font-semibold text-[#75866B]">Tip:</span>{" "}
                ข้อมูลที่ครบถ้วนช่วยให้ AI แนะนำเสื้อผ้าได้เหมาะสมยิ่งขึ้น
              </p>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 rounded-xl border-2 border-orange-800/40 bg-white p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
