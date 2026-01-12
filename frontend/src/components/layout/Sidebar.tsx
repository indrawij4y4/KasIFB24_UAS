import { Home, Grid3x3, ClipboardList, Trophy, LogOut, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuth } from "../../features/auth/AuthContext";

const navItems = [
    { id: "dashboard", label: "Home", icon: Home, path: "/" },
    { id: "matrix", label: "Matrix", icon: Grid3x3, path: "/matrix" },
    { id: "report", label: "Laporan", icon: ClipboardList, path: "/report" },
    { id: "leaderboard", label: "Leader", icon: Trophy, path: "/leaderboard" },
    { id: "settings", label: "Setting", icon: Settings, path: "/settings" },
];

export function Sidebar() {
    const location = useLocation();
    const { logout } = useAuth();

    const handleLogout = () => {
        if (window.confirm("Apakah anda yakin ingin keluar?")) {
            logout();
        }
    };

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white/80 dark:bg-muted/95 backdrop-blur-xl border-r border-slate-200 dark:border-white/5 z-50 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-colors duration-300">
            <div className="p-6 pt-8 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
                <div className="w-12 h-12 bg-white dark:bg-card rounded-xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden flex-shrink-0">
                    <img src="./logo.jpg" alt="Logo IFB24" className="w-full h-full object-cover" />
                </div>
                <div>
                    <h1 className="text-lg font-black text-primary tracking-tight">
                        KAS KELAS
                    </h1>
                    <p className="text-xs text-slate-400 dark:text-muted-foreground font-medium">
                        Panel Admin & Siswa
                    </p>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                    return (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={cn(
                                "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm group",
                                isActive
                                    ? "bg-blue-50/50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold"
                                    : "text-slate-500 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-foreground"
                            )}
                        >
                            {/* Active Indicator Line */}
                            {isActive && (
                                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 dark:bg-blue-500 rounded-r-full" />
                            )}

                            <item.icon className={cn(
                                "w-5 h-5 stroke-[2px]", // Uniform stroke weight
                                isActive ? "text-blue-600 dark:text-blue-500" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                            )} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-100 dark:border-white/5">

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-slate-500 text-sm font-bold hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar</span>
                </button>
            </div>
        </aside>
    );
}
