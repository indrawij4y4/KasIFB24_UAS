import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, pemasukanApi, usersApi } from '../../services/api';
import type { Student } from '../../services/api';
import { Loader2, ChevronLeft, CheckCircle2, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../lib/utils';

// Get current month and year
const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

// Get current week of the month (1-5)
const getCurrentWeek = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayOfMonth = now.getDate();
    const firstDayOfWeek = firstDay.getDay();
    return Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
};

export function ArrearsScreen() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
    const selectedYear = currentYear.toString();

    // Payment Modal State
    const [paymentModal, setPaymentModal] = useState<{ open: boolean; studentName: string; studentNim: string; userId: number | null; week: number | null }>({
        open: false,
        studentName: '',
        studentNim: '',
        userId: null,
        week: null,
    });
    // Error Modal State
    const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({
        isOpen: false,
        message: ''
    });

    // Success Modal State
    const [successModal, setSuccessModal] = useState(false);

    // Determine current "real" week for highlighting overdue
    const realCurrentWeek = getCurrentWeek();
    const isCurrentMonth = parseInt(selectedMonth) === currentMonth && parseInt(selectedYear) === currentYear;
    const isPastMonth = parseInt(selectedYear) < currentYear || (parseInt(selectedYear) === currentYear && parseInt(selectedMonth) < currentMonth);

    // Auto-refresh interval for realtime updates (10 seconds)
    const REALTIME_INTERVAL = 10 * 1000;

    const { data: arrears, isLoading } = useQuery({
        queryKey: ['arrears', selectedMonth, selectedYear],
        queryFn: () => api.getArrears(parseInt(selectedMonth), parseInt(selectedYear)),
        staleTime: 5 * 1000,
        refetchInterval: REALTIME_INTERVAL, // Realtime updates
    });

    // Fetch users to get IDs for mutation
    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: usersApi.getAll,
        staleTime: 30 * 1000, // Less frequent
    });

    const { data: settings } = useQuery({
        queryKey: ['settings', selectedMonth, selectedYear],
        queryFn: () => api.getSettings(parseInt(selectedMonth), parseInt(selectedYear)),
        staleTime: 30 * 1000,
        refetchInterval: 30 * 1000,
    });

    // Use unpaid_weeks from backend directly instead of recalculating
    const getMissingWeeks = (s: Student & { unpaid_weeks?: number[] }) => {
        // Backend already calculates which weeks are unpaid
        return s.unpaid_weeks || [];
    }

    const calculateTotalDue = (s: Student & { unpaid_weeks?: number[]; total_unpaid?: number }) => {
        // Use backend calculated total directly for accuracy
        return s.total_unpaid || 0;
    }

    // Mutation for bulk payment
    const bulkMutation = useMutation({
        mutationFn: async () => {
            if (!paymentModal.userId) return;
            // If week is null, it's a bulk payment
            if (paymentModal.week === null) {
                return pemasukanApi.bulkStore({
                    user_id: paymentModal.userId,
                    bulan: parseInt(selectedMonth),
                    tahun: parseInt(selectedYear),
                });
            } else {
                // Single week payment ("Make Full")
                // We use bulkStore with minggu_ke to leverage the "Make Full" logic (Top up remaining only)
                // instead of store() which is now Additive (would result in double charge if not careful)
                return pemasukanApi.bulkStore({
                    user_id: paymentModal.userId,
                    bulan: parseInt(selectedMonth),
                    tahun: parseInt(selectedYear),
                    minggu_ke: paymentModal.week,
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['arrears'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            setPaymentModal(prev => ({ ...prev, open: false }));
            setSuccessModal(true);
        },
        onError: (error: any) => {
            setErrorModal({ isOpen: true, message: "Gagal memproses pembayaran: " + (error.message || "Unknown error") });
            setPaymentModal(prev => ({ ...prev, open: false }));
        }
    });

    const handleWeekClick = (student: { nim: string, name?: string, nama?: string }, week: number) => {
        const user = users?.find(u => u.nim === student.nim);
        if (user) {
            setPaymentModal({
                open: true,
                studentName: student.name || student.nama || 'Mahasiswa',
                studentNim: student.nim,
                userId: user.id,
                week
            });
        } else {
            setErrorModal({ isOpen: true, message: "Data user tidak ditemukan untuk mahasiswa ini." });
        }
    };

    const handleBulkPay = (student: { nim: string, name?: string, nama?: string }) => {
        const user = users?.find(u => u.nim === student.nim);
        if (user) {
            setPaymentModal({
                open: true,
                studentName: student.name || student.nama || 'Mahasiswa',
                studentNim: student.nim,
                userId: user.id,
                week: null // Indicates bulk payment
            });
        } else {
            setErrorModal({ isOpen: true, message: "Data user tidak ditemukan untuk mahasiswa ini." });
        }
    }

    const months = [
        { label: 'Januari', value: '1' }, { label: 'Februari', value: '2' },
        { label: 'Maret', value: '3' }, { label: 'April', value: '4' },
        { label: 'Mei', value: '5' }, { label: 'Juni', value: '6' },
        { label: 'Juli', value: '7' }, { label: 'Agustus', value: '8' },
        { label: 'September', value: '9' }, { label: 'Oktober', value: '10' },
        { label: 'November', value: '11' }, { label: 'Desember', value: '12' },
    ];


    return (
        <div className="p-6 bg-background min-h-screen animate-fadeIn pb-32">
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="w-12 h-12 bg-card rounded-2xl shadow-sm border border-border flex items-center justify-center text-muted-foreground active:scale-95 transition-all hover:border-blue-200 hover:text-blue-500 hover:shadow-md group"><ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" /></button>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Daftar Tunggakan</h2>
                        <p className="text-muted-foreground text-sm">Kelola tagihan anggota yang belum lunas</p>
                    </div>
                </div>

                {/* Period Filter */}
                <div className="bg-card p-4 rounded-2xl shadow-sm border border-border">
                    <div className="grid grid-cols-1">
                        <Select
                            label="Bulan"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            options={months}
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="min-h-[300px] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : !settings?.weeklyFee ? (
                /* No Settings Configured */
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-card rounded-3xl border border-dashed border-border">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-2">
                        <Settings className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground">Belum Ada Pengaturan</h3>
                        <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">
                            Admin belum mengatur tagihan kas untuk periode ini. Silakan atur terlebih dahulu di pengaturan.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {arrears?.map((s) => {
                        const missingWeeks = getMissingWeeks(s);
                        const totalDue = calculateTotalDue(s);

                        if (missingWeeks.length === 0) return null;

                        return (
                            <div key={s.nim} className="bg-card p-4 rounded-3xl border border-border shadow-sm relative overflow-hidden group">
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 rounded-l-3xl"></div>
                                <div className="flex justify-between items-center mb-3 pl-3">
                                    <div className="flex-1 min-w-0 mr-4">
                                        <h3 className="font-bold text-base text-foreground truncate">{s.name}</h3>
                                        <p className="text-xs text-muted-foreground font-medium tracking-wide">{s.nim}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-sm font-black text-rose-600 dark:text-rose-400 block">
                                            Rp {totalDue.toLocaleString('id-ID')}
                                        </span>
                                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                            <span className="text-[10px] font-bold text-muted-foreground">
                                                {missingWeeks.length} Minggu Belum
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pl-3">
                                    <div className="flex flex-wrap gap-2">
                                        {missingWeeks.map(w => {
                                            const isOverdue = isPastMonth || (isCurrentMonth && w < realCurrentWeek);
                                            return (
                                                <button
                                                    key={w}
                                                    onClick={() => handleWeekClick(s, w)}
                                                    className={cn(
                                                        "text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all active:scale-95",
                                                        isOverdue
                                                            ? "bg-rose-600 text-white border-rose-700 shadow-sm hover:bg-rose-700"
                                                            : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/30"
                                                    )}
                                                >
                                                    M{w}
                                                </button>
                                            )
                                        })}
                                        {/* Bulk Pay Button - Placed next to weeks */}
                                        {missingWeeks.length > 1 && (
                                            <button
                                                onClick={() => handleBulkPay(s)}
                                                className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                                            >
                                                Bayar Sekaligus
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {(!arrears || arrears.length === 0) && (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-2">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Tidak Ada Tunggakan</h3>
                                <p className="text-muted-foreground text-sm max-w-[200px] mx-auto">Semua anggota telah melunasi iuran untuk periode ini.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Payment Confirmation Modal */}
            <Modal
                isOpen={paymentModal.open}
                onClose={() => setPaymentModal(prev => ({ ...prev, open: false }))}
                onConfirm={() => bulkMutation.mutate()}
                title="Konfirmasi Pelunasan"
                description={
                    paymentModal.userId
                        ? paymentModal.week === null
                            ? `Lunasi semua tunggakan (${getMissingWeeks(arrears?.find(s => s.nim === paymentModal.studentNim) || {} as any).length} minggu) untuk ${paymentModal.studentName}?`
                            : `Tandai iuran Minggu ${paymentModal.week} untuk ${paymentModal.studentName} sebagai lunas?`
                        : ''
                }
                type="confirm"
                confirmLabel={bulkMutation.isPending ? "Memproses..." : "Ya, Lunas"}
            />

            {/* Success Modal */}
            <Modal
                isOpen={successModal}
                onClose={() => setSuccessModal(false)}
                title="Berhasil"
                description="Iuran berhasil dilunasi."
                type="success"
            />

            {/* Error Feedback Modal */}
            <Modal
                isOpen={errorModal.isOpen}
                onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
                title="Gagal"
                description={errorModal.message}
                type="error"
            />
        </div>
    );
}
