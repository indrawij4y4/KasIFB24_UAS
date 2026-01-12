import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { authApi, usersApi, api, type User } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Modal } from '../../components/ui/Modal';
import * as Lucide from 'lucide-react';
import { cn, getWeeksInMonth } from '../../lib/utils';

// Helper: Format number with thousand separator (Indonesian format uses ".")
const formatNumber = (value: string | number): string => {
    const num = typeof value === 'string' ? value.replace(/\D/g, '') : value.toString();
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Helper: Parse formatted number back to plain number
const parseFormattedNumber = (value: string): string => {
    return value.replace(/\./g, '');
};

// Month options
const months = [
    { label: 'Januari', value: '1' }, { label: 'Februari', value: '2' },
    { label: 'Maret', value: '3' }, { label: 'April', value: '4' },
    { label: 'Mei', value: '5' }, { label: 'Juni', value: '6' },
    { label: 'Juli', value: '7' }, { label: 'Agustus', value: '8' },
    { label: 'September', value: '9' }, { label: 'Oktober', value: '10' },
    { label: 'November', value: '11' }, { label: 'Desember', value: '12' },
];

// Year options removed - using current year automatically
const currentYear = new Date().getFullYear();

export const SettingsScreen = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isAdmin = user?.role === 'admin';

    // Generic Feedback Modal State
    const [modalFeedback, setModalFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    const showModal = (type: 'success' | 'error', title: string, message: string) => {
        setModalFeedback({ isOpen: true, type, title, message });
    };

    // Change Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Reset Member Password State (Admin)
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [isResettingPassword, setIsResettingPassword] = useState(false);

    // Reset Data State (Admin)
    const [isResetDataModalOpen, setIsResetDataModalOpen] = useState(false);
    const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
    const [isVerifyingReset, setIsVerifyingReset] = useState(false);

    // Financial Settings State (with period selection like Dashboard)
    const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
    const [weeklyFee, setWeeklyFee] = useState<string>('');
    const [configuredMonths, setConfiguredMonths] = useState<Set<string>>(new Set());
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    const [isResetMemberConfirmOpen, setIsResetMemberConfirmOpen] = useState(false);

    // Fetch settings for specific period (React Query)
    const { data: periodSettings, isLoading: isLoadingSettings } = useQuery({
        queryKey: ['settings', selectedMonth, currentYear],
        queryFn: () => api.getSettings(parseInt(selectedMonth), currentYear),
        staleTime: 5 * 60 * 1000,
        enabled: isAdmin,
    });

    // Fetch all months settings to track which are configured
    useEffect(() => {
        if (!isAdmin) return;
        // Clear configured months when mounting
        setConfiguredMonths(new Set());

        const fetchAllMonthsSettings = async () => {
            const configured = new Set<string>();
            for (let month = 1; month <= 12; month++) {
                try {
                    const settings = await api.getSettings(month, currentYear);
                    // Use is_configured flag from backend if available, otherwise fallback to fee > 0
                    if (settings.is_configured || (settings.weeklyFee > 0 && !settings.hasOwnProperty('is_configured'))) {
                        configured.add(month.toString());
                    }
                } catch (e) {
                    // Ignore errors for individual months
                }
            }
            setConfiguredMonths(configured);
        };
        fetchAllMonthsSettings();
    }, [isAdmin]);

    // Update weeklyFee when settings data changes
    useEffect(() => {
        if (periodSettings) {
            setWeeklyFee(formatNumber(periodSettings.weeklyFee));
        }
    }, [periodSettings]);

    // Handle fee input change with formatting
    const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = parseFormattedNumber(e.target.value);
        if (rawValue === '' || /^\d+$/.test(rawValue)) {
            setWeeklyFee(formatNumber(rawValue));
        }
    };

    // Auto-calculate weeks for selected period
    const weeksInSelectedMonth = getWeeksInMonth(currentYear, parseInt(selectedMonth) - 1);

    // Save settings mutation
    const settingsMutation = useMutation({
        mutationFn: api.updateSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            showModal('success', 'Berhasil', `Pengaturan untuk ${months[parseInt(selectedMonth) - 1].label} ${currentYear} berhasil disimpan!`);
        },
        onError: (error: any) => {
            showModal('error', 'Gagal', error.message || 'Gagal menyimpan pengaturan');
        }
    });

    useEffect(() => {
        if (isAdmin) {
            loadUsers();
        }
    }, [isAdmin]);

    const loadUsers = async () => {
        try {
            const data = await usersApi.getAll();
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users', error);
        }
    };

    const handleUpdateFinancial = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSaveConfirmOpen(false);
        const feeValue = parseInt(parseFormattedNumber(weeklyFee));
        settingsMutation.mutate({
            weeklyFee: feeValue,
            weeksPerMonth: weeksInSelectedMonth,
            month: parseInt(selectedMonth),
            year: currentYear
        });
        // Update configured months after successful save
        setConfiguredMonths(prev => new Set(prev).add(selectedMonth));
    };

    const openSaveConfirmation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!weeklyFee || parseFormattedNumber(weeklyFee) === '0') {
            showModal('error', 'Validasi Gagal', 'Nominal iuran tidak boleh kosong atau nol');
            return;
        }
        setIsSaveConfirmOpen(true);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showModal('error', 'Gagal', 'Password baru tidak cocok!');
            return;
        }

        setIsChangingPassword(true);
        try {
            await authApi.changePassword(currentPassword, newPassword);
            showModal('success', 'Berhasil', 'Password berhasil diubah!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            showModal('error', 'Gagal', error.message || 'Gagal mengubah password');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleResetMemberPassword = async () => {
        if (!selectedUserId) return;

        setIsResetMemberConfirmOpen(false);
        setIsResettingPassword(true);
        try {
            await authApi.resetPassword(parseInt(selectedUserId));
            showModal('success', 'Berhasil', 'Password member berhasil direset ke default (NIM)!');
            setSelectedUserId('');
        } catch (error: any) {
            showModal('error', 'Gagal', error.message || 'Gagal mereset password');
        } finally {
            setIsResettingPassword(false);
        }
    };

    const openResetMemberConfirmation = () => {
        if (!selectedUserId) {
            showModal('error', 'Validasi Gagal', 'Pilih mahasiswa terlebih dahulu');
            return;
        }
        setIsResetMemberConfirmOpen(true);
    };

    const openResetDataModal = () => {
        setAdminPasswordConfirm('');
        setIsResetDataModalOpen(true);
    };

    const handleConfirmResetData = async () => {
        if (!adminPasswordConfirm) {
            showModal('error', 'Validasi Gagal', 'Masukkan password anda untuk konfirmasi');
            return;
        }

        setIsVerifyingReset(true);
        try {
            await authApi.login(user!.nim, adminPasswordConfirm);
            await api.resetAllData();
            setIsResetDataModalOpen(false);
            showModal('success', 'Reset Berhasil', 'Semua data aplikasi berhasil direset!');
        } catch (error: any) {
            showModal('error', 'Gagal', 'Password salah! Gagal mereset data.');
        } finally {
            setIsVerifyingReset(false);
        }
    };

    // Logout State
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const { logout } = useAuth(); // Destructure logout from useAuth

    const handleLogout = () => {
        logout();
        // Context will handle redirect
    };

    if (!user) return null;

    return (
        <div className="min-h-screen animate-fadeIn pb-28 md:pb-12">
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

                {/* Modals */}
                <Modal
                    isOpen={modalFeedback.isOpen}
                    onClose={() => setModalFeedback(prev => ({ ...prev, isOpen: false }))}
                    title={modalFeedback.title}
                    description={modalFeedback.message}
                    type={modalFeedback.type}
                />

                <Modal
                    isOpen={isResetDataModalOpen}
                    onClose={() => setIsResetDataModalOpen(false)}
                    onConfirm={handleConfirmResetData}
                    title="Konfirmasi Reset Data"
                    description="Tindakan ini sangat berbahaya dan tidak dapat dibatalkan. Masukkan password anda untuk melanjutkan."
                    type="confirm"
                    confirmLabel={isVerifyingReset ? "Memverifikasi..." : "Konfirmasi & Hapus"}
                >
                    <div className="mt-4 text-left">
                        <Input
                            type="password"
                            label="Password Admin"
                            placeholder="Masukkan password anda"
                            value={adminPasswordConfirm}
                            onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                            required
                            autoFocus
                            rightIcon={<Lucide.Key className="w-4 h-4 text-muted-foreground" />}
                        />
                    </div>
                </Modal>

                {/* Save Fee Confirmation Modal */}
                <Modal
                    isOpen={isSaveConfirmOpen}
                    onClose={() => setIsSaveConfirmOpen(false)}
                    onConfirm={() => handleUpdateFinancial()}
                    title="Konfirmasi Perubahan"
                    description={`Apakah anda yakin ingin mengatur iuran mingguan menjadi Rp ${weeklyFee} untuk periode ${months[parseInt(selectedMonth) - 1]?.label} ${currentYear}?`}
                    type="confirm"
                    confirmLabel={settingsMutation.isPending ? "Menyimpan..." : "Ya, Simpan"}
                />

                {/* Reset Member Password Confirmation Modal */}
                <Modal
                    isOpen={isResetMemberConfirmOpen}
                    onClose={() => setIsResetMemberConfirmOpen(false)}
                    onConfirm={handleResetMemberPassword}
                    title="Reset Password Member?"
                    description={`Password ${users.find(u => u.id.toString() === selectedUserId)?.nama || 'member'} akan direset ke default (NIM). Tindakan ini tidak dapat dibatalkan.`}
                    type="confirm"
                    confirmLabel={isResettingPassword ? "Mereset..." : "Ya, Reset Password"}
                />

                {/* Logout Confirmation Modal */}
                <Modal
                    isOpen={isLogoutConfirmOpen}
                    onClose={() => setIsLogoutConfirmOpen(false)}
                    onConfirm={handleLogout}
                    title="Konfirmasi Logout"
                    description="Apakah anda yakin ingin keluar dari aplikasi?"
                    type="confirm"
                    confirmLabel="Ya, Keluar"
                />

                {/* Page Header */}
                <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                            <Lucide.Settings className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                                Pengaturan
                            </h1>
                            <p className="text-muted-foreground text-sm font-medium">
                                Kelola akun
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsLogoutConfirmOpen(true)}
                        className="text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl md:hidden"
                        title="Keluar Aplikasi"
                    >
                        <Lucide.LogOut className="w-6 h-6" />
                    </Button>
                </div>

                {/* Section 3: Konfigurasi Kas (Admin) - Full functionality like Dashboard */}
                {isAdmin && (
                    <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
                        <div className="p-5 md:p-6 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <Lucide.CreditCard className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-foreground">Konfigurasi Kas</h2>
                                    <p className="text-xs text-muted-foreground">Atur iuran mingguan per periode</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 md:p-6">
                            <form onSubmit={openSaveConfirmation} className="space-y-5">
                                {/* Period Selection */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
                                            Pilih Bulan
                                        </label>
                                        <div className="flex overflow-x-auto pb-3 gap-2 scrollbar-hide -mx-1 px-1 snap-x">
                                            {months.map((m) => {
                                                const isConfigured = configuredMonths.has(m.value);
                                                const isSelected = selectedMonth === m.value;
                                                return (
                                                    <button
                                                        key={m.value}
                                                        type="button"
                                                        onClick={() => setSelectedMonth(m.value)}
                                                        className={cn(
                                                            "flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border snap-center flex items-center gap-2",
                                                            isSelected
                                                                ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30 scale-105"
                                                                : isConfigured
                                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                                                    : "bg-muted/50 text-muted-foreground border-border hover:border-emerald-500/50 hover:bg-muted"
                                                        )}
                                                    >
                                                        {isConfigured && (
                                                            <Lucide.Check className={cn(
                                                                "w-4 h-4",
                                                                isSelected ? "text-white" : "text-emerald-500"
                                                            )} />
                                                        )}
                                                        {m.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </div>
                                <div className="space-y-4">
                                    <Input
                                        type="text"
                                        inputMode="numeric"
                                        label="Iuran Mingguan (Rp)"
                                        leftIcon={<span className="font-bold text-sm text-emerald-500">Rp</span>}
                                        value={weeklyFee}
                                        onChange={handleFeeChange}
                                        placeholder="Contoh: 10.000"
                                        required
                                        disabled={isLoadingSettings}
                                    />

                                    {/* Info Card */}
                                    <div className="bg-muted/50 p-4 rounded-2xl border border-border">
                                        <div className="flex items-center justify-between text-sm mb-2">
                                            <span className="text-muted-foreground font-medium flex items-center gap-2">
                                                <Lucide.Calendar className="w-4 h-4" />
                                                Jumlah Minggu:
                                            </span>
                                            <span className="font-bold text-emerald-500">{weeksInSelectedMonth} Minggu</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Pengaturan ini berlaku untuk <strong className="text-foreground">{months[parseInt(selectedMonth) - 1].label} {currentYear}</strong>.
                                            Periode lain tidak akan terpengaruh.
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={settingsMutation.isPending || isLoadingSettings}
                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold h-11 px-6 shadow-lg shadow-emerald-500/20 w-full md:w-auto"
                                >
                                    {settingsMutation.isPending ? (
                                        <><Lucide.Loader2 className="w-4 h-4 animate-spin mr-2" /> Menyimpan...</>
                                    ) : (
                                        <><Lucide.CheckCircle2 className="w-4 h-4 mr-2" /> Simpan Konfigurasi</>
                                    )}
                                </Button>
                            </form>
                        </div>
                    </div>
                )
                }

                {/* Section: Reset Member Password */}
                {isAdmin && (
                    <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
                        <div className="p-5 md:p-6 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                    <Lucide.User className="w-5 h-5 text-orange-500" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-foreground">Reset Password Member</h2>
                                    <p className="text-xs text-muted-foreground">Reset password mahasiswa ke default (NIM)</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 md:p-6">
                            <div className="space-y-4">
                                <SearchableSelect
                                    label="Pilih Mahasiswa"
                                    value={selectedUserId}
                                    onChange={setSelectedUserId}
                                    options={users.map(u => ({ value: u.id.toString(), label: `${u.nim} - ${u.nama}` }))}
                                    placeholder="Cari nama atau NIM..."
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={openResetMemberConfirmation}
                                    disabled={!selectedUserId || isResettingPassword}
                                    className="font-bold h-11 px-6 border border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-500"
                                >
                                    {isResettingPassword ? (
                                        <><Lucide.Loader2 className="w-4 h-4 animate-spin mr-2" /> Mereset...</>
                                    ) : (
                                        <><Lucide.Key className="w-4 h-4 mr-2" /> Reset ke Default</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Section: Change Password */}
                <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
                    <div className="p-5 md:p-6 border-b border-border bg-muted/30">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Lucide.Shield className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <h2 className="font-bold text-foreground">Ganti Password</h2>
                                <p className="text-xs text-muted-foreground">Kelola keamanan akun anda</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-5 md:p-6">
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <Input
                                type="password"
                                label="Password Saat Ini"
                                placeholder="Masukkan password saat ini"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                leftIcon={<Lucide.Lock className="w-4 h-4 text-muted-foreground" />}
                            />
                            <div className="grid md:grid-cols-2 gap-4">
                                <Input
                                    type="password"
                                    label="Password Baru"
                                    placeholder="Masukkan password baru"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    leftIcon={<Lucide.Key className="w-4 h-4 text-muted-foreground" />}
                                />
                                <Input
                                    type="password"
                                    label="Konfirmasi Password"
                                    placeholder="Ulangi password baru"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    leftIcon={<Lucide.Key className="w-4 h-4 text-muted-foreground" />}
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isChangingPassword}
                                className="bg-blue-600 hover:bg-blue-700 font-bold h-11 px-6 shadow-lg shadow-blue-500/20"
                            >
                                {isChangingPassword ? (
                                    <><Lucide.Loader2 className="w-4 h-4 animate-spin mr-2" /> Memproses...</>
                                ) : (
                                    <><Lucide.Lock className="w-4 h-4 mr-2" /> Update Password</>
                                )}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Section 4: Danger Zone (Admin) */}
                {
                    isAdmin && (
                        <div className="bg-card rounded-3xl border border-border border-l-4 border-l-rose-500 overflow-hidden shadow-sm">
                            <div className="p-5 md:p-6 border-b border-border bg-rose-500/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                                        <Lucide.AlertTriangle className="w-5 h-5 text-rose-500" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-rose-600 dark:text-rose-400">Danger Zone</h2>
                                        <p className="text-xs text-rose-500/80">Tindakan berbahaya dan permanen</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 md:p-6 bg-rose-500/5">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
                                            <Lucide.Database className="w-4 h-4 text-rose-500" />
                                            Reset Total Data
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Menghapus seluruh riwayat transaksi. Data akun tidak akan dihapus.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="danger"
                                        onClick={openResetDataModal}
                                        className="bg-rose-600 hover:bg-rose-700 text-white h-11 px-6 font-bold shadow-lg shadow-rose-500/20 w-full md:w-auto"
                                    >
                                        <Lucide.Database className="w-4 h-4 mr-2" />
                                        Reset Data
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Section 5: About */}
                <div className="bg-gradient-to-br from-violet-500/10 via-card to-indigo-500/10 rounded-3xl border border-border overflow-hidden shadow-sm">
                    <div className="p-8 md:p-10 text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-5 shadow-lg shadow-violet-500/25 overflow-hidden">
                            <img src="./logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                        </div>

                        <h2 className="text-xl font-black text-foreground mb-2">Kas IFB24</h2>
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-wider mb-4">
                            v1.0.0 Public Beta
                        </div>

                        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                            Platform manajemen keuangan kelas untuk transparansi dan akuntabilitas.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Dibuat oleh <span className="font-bold text-foreground">Indra IFB 2026</span>
                        </p>

                        <div className="mt-6 pt-4 border-t border-border">
                            <span className="text-xs text-muted-foreground/50">2026 © All Rights Reserved</span>
                        </div>
                    </div>
                </div>

            </div >
        </div >
    );
};
