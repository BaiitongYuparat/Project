import { NavLink, Outlet } from "react-router-dom";

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
    <div className="w-full px-3">
      <div className="py-5 ">
        <p className="font-bold text-2xl text-secondary">รู้จักรูปร่างของคุณ</p>
        <p>ข้อมูลของคุณช่วยให้ AI เลือกทรงและสัดส่วนได้ใกล้เคียงขึ้น</p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 md:w-1/4">
          <div className="rounded-xl bg-primary p-5 gap-2 border-2 border-orange-800/40">
            <h2 className="mb-2 text-lg font-bold">เริ่มจากตัวคุณ</h2>

            <p className="mb-4 text-sm text-secondary/50">
              กรอกข้อมูลสัดส่วนและเพิ่มรูปภาพรูปร่างของคุณ
              เพื่อให้ระบบแนะนำเสื้อผ้าที่เหมาะสม
            </p>

            <nav>
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    ` mb-1 block rounded-lg  text-sm transition ${
                      isActive
                        ? "text-orange-500 underline text-bold"
                        : "text-secondary/60 "
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>
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
