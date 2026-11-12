import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { IonIcon } from "@ionic/react";
import {
    closeOutline,
    gridOutline,
    menuOutline,
    storefrontOutline,
    peopleOutline,
    sparklesOutline,
    bodyOutline,
    logOutOutline,
    settingsOutline,
    chatbubblesOutline
} from "ionicons/icons";
import { logoutAdmin as logoutAdminApi } from "../services/adminAuthService";
import { logoutAdmin as clearAdminAuth } from "../store/adminSlice";
import ConfirmLogoutModal from "./ConfirmLogoutModal";


const menuItems = [
    {
        name: "Dashboard",
        path: "",
        icon: gridOutline
    },
    {
        name: "Store Management",
        path: "/store-management",
        icon: storefrontOutline
    },
    {
        name: "User Management",
        path: "/user-management",
        icon: peopleOutline
    },
    {
        name: "Appeals",
        path: "/appeals",
        icon: chatbubblesOutline
    },
    // {
    //     name: "Admin Management",
    //     path: "/admin-management",
    //     icon: shieldCheckmarkOutline
    // },
    {
        name: "AI Prompt Management",
        path: "/ai-prompt-management",
        icon: sparklesOutline
    },
    // {
    //     name: "Product Management",
    //     path: "/product-management",
    //     icon: pricetagsOutline
    // },
    {
        name: "Model Management",
        path: "/model-management",
        icon: bodyOutline
    },
    {
        name: "System",
        path: "/system",
        icon: settingsOutline
    }
]


const itemBase =
    "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";
function Logo() {
    return (
        <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-700 text-xl text-white">
            <IonIcon icon={storefrontOutline} />
            </span>
            <span className="text-lg font-bold leading-none text-gray-700">
                LongDress
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-gray-700">
                    Super Admin
                </span>
            </span>
        </span>
    );
}



export default function SuperAdminSidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const [confirmLogout, setConfirmLogout] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = async () => {
        setLoggingOut(true);

        try {
            await logoutAdminApi();
        } catch (error) {
            // ถ้า API ล้มเหลวก็ยังเคลียร์ state และเด้งกลับหน้า login
            console.error("Logout failed:", error);
        } finally {
            setLoggingOut(false);
            setConfirmLogout(false);
            dispatch(clearAdminAuth());
            navigate("/login", { replace: true });
        }
    };

    const basePath = `/superadmin`;

    return (
        <>
            {/* Mobile Header */}
            <div className="fixed top-0 left-0 z-40 flex h-16 w-full items-center justify-between border-b bg-white px-5 md:hidden">
                <Logo />

                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="rounded-lg p-2 text-2xl text-gray-700 hover:bg-gray-100"
                    aria-label="Open sidebar"
                >
                    <IonIcon icon={menuOutline} />
                </button>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 md:hidden"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                  fixed left-0 top-0 z-50 flex h-screen w-64 flex-col
                  border-r border-gray-200 bg-white
                  transition-transform duration-300
                  ${isOpen ? "translate-x-0" : "-translate-x-full"}
                  md:translate-x-0
                `}
            >
                {/* Logo */}
                <div className="flex h-16 items-center justify-between border-b px-6">
                    <Logo />

                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="text-2xl text-gray-500 hover:text-gray-800 md:hidden"
                        aria-label="Close sidebar"
                    >
                        <IonIcon icon={closeOutline} />
                    </button>
                </div>

                {/* Shop Admin Label */}
                <div className="px-6 py-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Super Admin
                    </p>
                </div>

                {/* Navigation */}
                <nav
                    aria-label="Super admin"
                    className="flex-1 space-y-1 overflow-y-auto px-3 pb-3"
                >
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={`${basePath}${item.path}`}
                            end={item.path === ""}
                            onClick={() => setIsOpen(false)}
                            className={({ isActive }) =>
                                `${itemBase} ${isActive
                                    ? "bg-gray-900 text-white"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <IonIcon
                                        icon={item.icon}
                                        className={`text-xl transition-colors ${isActive
                                            ? "text-white"
                                            : "text-gray-400 group-hover:text-gray-900"
                                            }`}
                                    />
                                    {item.name}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="border-t p-4">
                    <button
                        type="button"
                        onClick={() => {
                            setIsOpen(false);
                            setConfirmLogout(true);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                        <IonIcon
                            icon={logOutOutline}
                            className="text-xl text-gray-400 transition-colors group-hover:text-gray-900"
                        />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Confirm logout modal */}
            <ConfirmLogoutModal
                open={confirmLogout}
                loading={loggingOut}
                onCancel={() => setConfirmLogout(false)}
                onConfirm={handleLogout}
            />
        </>
    );

}