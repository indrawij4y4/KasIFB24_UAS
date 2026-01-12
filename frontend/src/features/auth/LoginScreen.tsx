import { useState } from "react";
import { useAuth } from "./AuthContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Eye, EyeOff, CircleAlert, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function LoginScreen() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [nim, setNim] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError("");
        setLoading(true);
        try {
            const success = await login(nim, password);
            if (success) {
                navigate("/");
            } else {
                setError("NIM atau sandi salah.");
            }
        } catch (e) {
            setError("Terjadi kesalahan.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen w-full lg:overflow-hidden animate-fadeIn font-['Inter'] antialiased text-white bg-black">

            {/* Desktop Left Side (Hidden on Mobile) */}
            <div className="hidden lg:flex w-[60%] bg-[#0f172a] relative overflow-hidden flex-col justify-between p-20">
                {/* Abstract overlay with Class Photo */}
                <div className="absolute inset-0 bg-[url('/login-bg.jpg')] bg-cover bg-center opacity-60"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-blue-950/80 opacity-80"></div>

                <div className="relative z-10 space-y-8">
                    {/* Header */}
                    <div>
                        <div className="flex items-center gap-5 mb-8">
                            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl p-1 flex items-center justify-center shadow-2xl border border-white/10 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                                <img src="./logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-xl" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold tracking-[0.2em] text-cyan-400 uppercase mb-2">Kas IFB24</h2>
                                <p className="text-sm font-medium text-slate-400">Informatika Engineering • IFB24</p>
                            </div>
                        </div>
                        <h1 className="text-6xl font-bold leading-tight tracking-tight text-white mb-6">
                            Transparansi & <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Akuntabilitas</span>
                        </h1>
                        <p className="text-lg text-[#cbd5e1] max-w-lg font-medium leading-[1.6]">
                            Platform manajemen kas dan keuangan kelas yang transparan, memudahkan monitoring pembayaran serta pelaporan dana.
                        </p>
                    </div>

                    {/* How it Works */}
                    <div className="grid gap-6 mt-8">
                        <div className="flex flex-col gap-1 group">
                            <h3 className="font-semibold text-white text-lg">Akses Mahasiswa</h3>
                            <p className="text-[15px] text-[#cbd5e1] leading-relaxed">Gunakan NIM Anda untuk masuk, mengecek tagihan, dan status pembayaran.</p>
                        </div>
                        <div className="flex flex-col gap-1 group">
                            <h3 className="font-semibold text-white text-lg">Laporan Keuangan</h3>
                            <p className="text-[15px] text-[#cbd5e1] leading-relaxed">Pantau arus kas, saldo terkini, dan laporan pengeluaran secara real-time.</p>
                        </div>

                    </div>
                </div>

                {/* Footer Info */}
                <div className="relative z-10 pt-8 mt-8 border-t border-white/5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold mb-4">Informasi Login</p>
                    <div className="space-y-3 font-mono text-sm">
                        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-colors cursor-help group max-w-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 group-hover:shadow-[0_0_8px_rgba(96,165,250,0.8)] transition-all"></span>
                            <span className="text-[#A3A3A3]">Admin: <span className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 ml-2">240602036</span></span>
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-colors cursor-help group max-w-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:shadow-[0_0_8px_rgba(148,163,184,0.8)] transition-all"></span>
                            <span className="text-[#A3A3A3]">Default Pass: <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-slate-300 ml-2">NIM Mahasiswa</span></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side (Form) - Main Container on Mobile */}
            <div className="w-full lg:w-[40%] bg-black flex flex-col justify-center items-center py-10 px-6 lg:p-12 relative min-h-screen lg:min-h-0">

                {/* Mobile Header (Visible only on Mobile) */}
                <div className="lg:hidden flex flex-col items-center mb-10 w-full animate-fadeIn relative z-10">
                    {/* Ambient Glow Effect (Premium Touch) */}
                    <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-[radial-gradient(circle,rgba(59,130,246,0.3)_0%,rgba(0,0,0,0)_70%)] blur-[40px] -z-10 pointer-events-none"></div>

                    <div className="w-[60px] h-[60px] bg-white/10 backdrop-blur-md rounded-2xl p-1 flex items-center justify-center shadow-2xl border border-white/10 mb-4 transform hover:scale-105 transition-transform">
                        <img src="./logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-xl" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Kas IFB24</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Informatika Engineering</p>
                </div>

                <div className="w-full max-w-[380px] z-10">
                    {/* Login Card Container - Desktop Only Border */}
                    <div className="bg-transparent lg:bg-black lg:border lg:border-white/15 lg:p-10 lg:rounded-xl lg:shadow-[0_4px_20px_rgba(0,0,0,0.5)] w-full">
                        <div className="text-center mb-10 lg:mb-8">
                            <h2 className="text-lg lg:text-2xl font-semibold text-white tracking-tight mb-2">Selamat Datang</h2>
                            <p className="text-[#8e8e8e] text-sm mb-[30px] lg:mb-0">Masuk untuk melanjutkan</p>
                        </div>

                        <div className="space-y-6 lg:space-y-5">
                            <div>
                                <label className="block text-[0.85rem] font-medium text-slate-200 mb-1.5 ml-1">NIM Mahasiswa</label>
                                <Input
                                    placeholder="Masukkan NIM..."
                                    label=""
                                    value={nim}
                                    onChange={(e) => setNim(e.target.value)}
                                    // Premium: Darker bg (#121212), Thin border (#333), h-[50px]
                                    className="!bg-[#121212] !border !border-[#333] !rounded-[8px] text-base lg:text-sm !text-white focus:!border-blue-500 !px-4 h-[50px] lg:h-auto lg:!py-3 placeholder:text-[#444] !mb-0 !mt-0 transition-all font-medium"
                                />
                            </div>

                            <div className="relative">
                                <label className="block text-[0.85rem] font-medium text-slate-200 mb-1.5 ml-1">Kata Sandi</label>
                                <Input
                                    placeholder="Masukkan Kata Sandi..."
                                    label=""
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    // Premium Input Styles
                                    className="!bg-[#121212] !border !border-[#333] !rounded-[8px] text-base lg:text-sm !text-white focus:!border-blue-500 !px-4 h-[50px] lg:h-auto lg:!py-3 placeholder:text-[#444] pr-12 !mb-0 !mt-0 transition-all font-medium"
                                    rightIcon={
                                        <button
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-[#666] hover:text-white transition-colors p-3 lg:p-2 -mr-2 lg:-mt-2.5 -mt-1.5"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5 lg:w-4 lg:h-4" /> : <Eye className="w-5 h-5 lg:w-4 lg:h-4" />}
                                        </button>
                                    }
                                />
                            </div>

                            {error && (
                                <div className="text-rose-500 text-xs font-medium flex items-center justify-center gap-2 animate-shake py-3 lg:py-2 bg-rose-500/10 rounded-lg border border-rose-500/10">
                                    <CircleAlert className="w-4 h-4 lg:w-3 lg:h-3" />
                                    {error}
                                </div>
                            )}

                            <div className="pt-2">
                                <Button
                                    onClick={handleSubmit}
                                    isLoading={loading}
                                    className="w-full h-[50px] lg:h-[45px] rounded-[10px] lg:rounded-[8px] text-base lg:text-sm font-semibold !bg-[#0095F6] hover:!bg-[#1877f2] transition-all active:scale-[0.98] !border-none text-white tracking-wide shadow-[0_4px_14px_0_rgba(0,118,255,0.39)] lg:mb-0 mb-4"
                                >
                                    Masuk
                                </Button>

                                {/* Info Hint */}
                                <div className="flex items-center justify-center gap-2 mt-6 px-4 py-3 bg-blue-900/20 rounded-lg">
                                    <Info className="w-4 h-4 text-blue-400" />
                                    <p className="text-[12px] text-blue-200/80 text-center font-medium">
                                        Info: Untuk login pertama, gunakan <span className="font-bold text-blue-300">NIM</span> sebagai password.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Sticky Bottom on Mobile */}
                <div className="lg:absolute lg:bottom-8 w-full text-center mt-auto pb-4 lg:pb-0 z-10">
                    <p className="text-[10px] lg:text-[11px] text-[#444] font-medium tracking-wide">
                        FROM <span className="font-bold text-[#666]">INFORMATIKA 24</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
