import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from 'lucide-react';
import { usersApi, pemasukanApi, pengeluaranApi, api } from "../../services/api";
import { getWeeksInMonth } from "../../lib/utils";
import { REALTIME_INTERVAL } from "../../config";

// Helper to get current month and year
const getCurrentMonth = () => new Date().getMonth() + 1;
const getCurrentYear = () => new Date().getFullYear();

// Helper functions for number formatting
const MAX_AMOUNT = 10000000; // Maximum 10 million
const MAX_AMOUNT_FORMATTED = '10.000.000';

const formatNumber = (value: string | number): string => {
    const num = typeof value === 'string' ? value.replace(/\D/g, '') : value.toString();
    if (!num) return '';
    return parseInt(num).toLocaleString('id-ID');
};

const parseNumber = (value: string): string => {
    return value.replace(/\D/g, '');
};

// Get current week of the month (1-5)
const getCurrentWeek = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayOfMonth = now.getDate();
    const firstDayOfWeek = firstDay.getDay();
    const week = Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
    return week > 5 ? 5 : week; // Cap at 5 generally
};

export function InputInScreen() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [successModal, setSuccessModal] = useState(false);
    const [errorModal, setErrorModal] = useState({ open: false, message: '' });

    // Form state
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth().toString());
    const [selectedYear] = useState(getCurrentYear().toString());
    const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek().toString());
    const [nominal, setNominal] = useState('');

    // Track last applied configuration to prevent overwriting manual edits
    // const lastConfigRef = useRef<{ m: string, y: string } | null>(null); // Removed as we use stronger Smart Logic now

    // Fetch users for dropdown
    const { data: users, isLoading: loadingUsers } = useQuery({
        queryKey: ['users'],
        queryFn: usersApi.getAll,
    });

    // Fetch settings to get weekly fee
    const { data: settings } = useQuery({
        queryKey: ['settings', selectedMonth, selectedYear],
        queryFn: () => api.getSettings(parseInt(selectedMonth), parseInt(selectedYear)),
        staleTime: 5 * 60 * 1000,
    });// Fetch matrix data to filter available weeks
    // We don't strictly need studentsMatrix if we use getStudents (which returns the same structure roughly), 
    // but preserving for now if needed or removing if completely unused.
    // The error said `studentsMatrix` is declared but never read.

    const { data: studentsData } = useQuery({
        queryKey: ['studentsData', selectedMonth, selectedYear],
        queryFn: () => api.getStudents(parseInt(selectedMonth), parseInt(selectedYear)),
        enabled: !!selectedUser,
    });

    // Helper to check if week is paid
    const isWeekPaid = (week: number) => {
        if (!studentsData || !selectedUser) return false;
        const student = studentsData.find((s: any) => s.id.toString() === selectedUser);
        if (!student) return false;

        // Check m1, m2, m3, m4, m5
        const key = `m${week}`;
        const amountPaid = student[key] || 0;
        const fee = settings?.weeklyFee || 0;

        // It is paid ONLY if amount met the fee (and fee is configured)
        return fee > 0 && amountPaid >= fee;
    };

    // Filter available weeks
    const totalWeeks = getWeeksInMonth(parseInt(selectedYear), parseInt(selectedMonth) - 1);

    // Create array [1, 2, ... totalWeeks]
    const weekOptions = Array.from({ length: totalWeeks }, (_, i) => i + 1).map(w => ({
        label: `Minggu ${w}`,
        value: w.toString(),
        disabled: isWeekPaid(w)
    })).filter(opt => !opt.disabled);

    // Set default user when users load
    useEffect(() => {
        if (users && users.length > 0 && !selectedUser) {
            setSelectedUser(users[0].id.toString());
        }
    }, [users, selectedUser]);

    // 1. Handle Week Selection automatically
    useEffect(() => {
        if (weekOptions.length > 0) {
            // If selected week is not in options (because it's filtered out/paid), select the first available
            // Check against values in weekOptions (which are strings)
            const isSelectedValid = weekOptions.some(opt => opt.value === selectedWeek);
            if (!isSelectedValid) {
                // Determine the "next" logical week to select? 
                // Or just the first available one as default
                setSelectedWeek(weekOptions[0].value);
            }
        } else {
            // No weeks available (all paid)
            if (selectedWeek !== '-') {
                setSelectedWeek('-');
            }
        }
    }, [weekOptions, selectedWeek]); // Runs when options calculation changes

    // 2. Handle Nominal Default (Smart Logic)
    useEffect(() => {
        if (settings?.weeklyFee !== undefined && selectedWeek !== '-' && selectedUser) {
            const fee = settings.weeklyFee;

            // Check if partal payment exists for selected week
            let remaining = fee;
            if (studentsData) {
                const student = studentsData.find((s: any) => s.id.toString() === selectedUser);
                if (student) {
                    const key = `m${selectedWeek}`;
                    const paid = student[key] || 0;
                    if (paid > 0) {
                        remaining = fee - paid;
                        if (remaining < 0) remaining = 0;
                    }
                }
            }

            // Only update if we haven't applied this month/year config yet OR if context changes
            // "Smart Logic" preference: Always suggest remaining amount when context changes.
            setNominal(remaining.toString());
        }
    }, [settings, selectedMonth, selectedYear, selectedWeek, selectedUser, studentsData]); // Depend on context

    // Mutation for saving pemasukan
    const mutation = useMutation({
        mutationFn: async () => {
            return pemasukanApi.store({
                user_id: parseInt(selectedUser),
                bulan: parseInt(selectedMonth),
                tahun: parseInt(selectedYear),
                minggu_ke: parseInt(selectedWeek),
                nominal: parseInt(nominal),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['arrears'] });
            setModalOpen(false);
            setSuccessModal(true);
        },
        onError: (error: any) => {
            setModalOpen(false);
            setErrorModal({
                open: true,
                message: error.message || 'Terjadi kesalahan saat menyimpan data. Silakan coba lagi.'
            });
        },
    });

    // Check if month is configured
    const isConfigured = settings?.is_configured !== false; // Default to true if undefined (loading/checked later)

    const handleSave = () => {
        if (!selectedUser || !nominal) {
            setErrorModal({ open: true, message: 'Lengkapi semua field!' });
            return;
        }

        if (settings?.is_configured === false) {
            setErrorModal({
                open: true,
                message: 'Bulan ini belum dikonfigurasi oleh Admin. Silakan hubungi admin untuk melakukan konfigurasi keuangan di menu Pengaturan.'
            });
            return;
        }

        // If week is empty or '-' (implies all paid)
        if ((!selectedWeek || selectedWeek === '-') && weekOptions.length === 0) {
            setErrorModal({ open: true, message: 'Mahasiswa ini sudah lunas untuk bulan ini.' });
            return;
        }

        const amount = parseInt(nominal);
        if (amount > MAX_AMOUNT) {
            setErrorModal({
                open: true,
                message: `Nominal melebihi batas maksimum. Maksimum input yang diizinkan adalah Rp ${MAX_AMOUNT_FORMATTED}. Silakan masukkan nominal yang lebih kecil.`
            });
            return;
        }

        if (amount <= 0) {
            setErrorModal({
                open: true,
                message: 'Nominal harus lebih dari Rp 0. Silakan masukkan nominal yang valid.'
            });
            return;
        }

        setModalOpen(true);
    };

    const months = [
        { label: 'Januari', value: '1' }, { label: 'Februari', value: '2' },
        { label: 'Maret', value: '3' }, { label: 'April', value: '4' },
        { label: 'Mei', value: '5' }, { label: 'Juni', value: '6' },
        { label: 'Juli', value: '7' }, { label: 'Agustus', value: '8' },
        { label: 'September', value: '9' }, { label: 'Oktober', value: '10' },
        { label: 'November', value: '11' }, { label: 'Desember', value: '12' },
    ];

    return (
        <div className="p-4 md:p-6 bg-background min-h-screen animate-fadeIn">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/')} className="w-10 h-10 bg-card rounded-xl shadow-sm border border-border flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"><ChevronLeft className="w-6 h-6" /></button>
                <h2 className="text-xl font-bold text-foreground">Input Iuran</h2>
            </div>

            {loadingUsers ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
                <div className="bg-card p-6 rounded-3xl shadow-sm space-y-4 border border-border">
                    {/* Warning if month not configured */}
                    {settings?.is_configured === false && (
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
                            <span>⚠️ Bulan ini belum dikonfigurasi. Tidak dapat menginput data.</span>
                        </div>
                    )}

                    <Select
                        label="Nama Mahasiswa"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        options={users?.map(u => ({ label: u.nama, value: u.id.toString() })) || []}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Select
                            label="Bulan"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            options={months}
                        />
                        <Select
                            label="Minggu Ke"
                            value={selectedWeek}
                            onChange={(e) => setSelectedWeek(e.target.value)}
                            options={weekOptions.length > 0 ? weekOptions : [{ label: 'Lunas Semua', value: '-' }]}
                            disabled={weekOptions.length === 0 || !isConfigured}
                        />
                    </div>

                    <Input
                        label="Nominal (Rp)"
                        type="text"
                        inputMode="numeric"
                        value={formatNumber(nominal)}
                        onChange={(e) => setNominal(parseNumber(e.target.value))}
                        placeholder="10.000"
                        disabled={!isConfigured}
                    />

                    <Button
                        onClick={handleSave}
                        variant="success"
                        className="w-full"
                        isLoading={mutation.isPending}
                        disabled={!isConfigured}
                    >
                        Simpan Iuran
                    </Button>
                </div>
            )}

            {/* Confirmation Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onConfirm={() => mutation.mutate()}
                title="Konfirmasi"
                description="Simpan data iuran ke sistem?"
                type="confirm"
                confirmLabel={mutation.isPending ? "Menyimpan..." : "Ya, Simpan"}
            />

            {/* Success Modal */}
            <Modal
                isOpen={successModal}
                onClose={() => { setSuccessModal(false); navigate('/'); }}
                title="Berhasil"
                description="Data iuran berhasil disimpan!"
                type="success"
            />

            {/* Error Modal */}
            <Modal
                isOpen={errorModal.open}
                onClose={() => setErrorModal({ open: false, message: '' })}
                title="Gagal"
                description={errorModal.message}
                type="error"
            />
        </div>
    );
}

export function InputOutScreen() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [successModal, setSuccessModal] = useState(false);
    const [errorModal, setErrorModal] = useState({ open: false, message: '' });

    // Form state
    const [judul, setJudul] = useState('');
    const [nominal, setNominal] = useState('');

    // Fetch current balance for validation
    const { data: stats } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: api.getStats,
        staleTime: 60 * 1000,
        refetchInterval: REALTIME_INTERVAL,
    }); const mutation = useMutation({
        mutationFn: async () => {
            const formData = new FormData();
            formData.append('judul', judul);
            formData.append('nominal', nominal);
            formData.append('tanggal', new Date().toISOString().split('T')[0]);
            return pengeluaranApi.store(formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            setModalOpen(false);
            setSuccessModal(true);
        },
        onError: (error: any) => {
            setModalOpen(false);
            setErrorModal({
                open: true,
                message: error.message || 'Gagal menyimpan data belanja.'
            });
        },
    });

    const handleSave = () => {
        if (!judul || !nominal) {
            setErrorModal({ open: true, message: 'Lengkapi judul dan nominal!' });
            return;
        }

        const amount = parseInt(nominal);
        const currentBalance = stats?.balance || 0;

        if (amount > MAX_AMOUNT) {
            setErrorModal({
                open: true,
                message: `Nominal melebihi batas maksimum. Maksimum input yang diizinkan adalah Rp ${MAX_AMOUNT_FORMATTED}. Silakan masukkan nominal yang lebih kecil.`
            });
            return;
        }

        if (amount <= 0) {
            setErrorModal({
                open: true,
                message: 'Nominal harus lebih dari Rp 0. Silakan masukkan nominal yang valid.'
            });
            return;
        }

        if (amount > currentBalance) {
            setErrorModal({
                open: true,
                message: `Saldo tidak cukup! Saldo saat ini: Rp ${currentBalance.toLocaleString('id-ID')}, nominal belanja: Rp ${amount.toLocaleString('id-ID')}.`
            });
            return;
        }

        setModalOpen(true);
    };

    return (
        <div className="p-4 md:p-6 bg-background min-h-screen animate-fadeIn">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/')} className="w-10 h-10 bg-card rounded-xl shadow-sm border border-border flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"><ChevronLeft className="w-6 h-6" /></button>
                <h2 className="text-xl font-bold text-foreground">Input Belanja</h2>
            </div>

            <div className="bg-card p-6 rounded-3xl shadow-sm space-y-4 border border-border">
                {/* Show current balance */}
                {stats && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Saldo Tersedia</p>
                        <p className="text-lg font-black text-blue-800">Rp {(stats.balance || 0).toLocaleString('id-ID')}</p>
                    </div>
                )}

                <Input
                    label="Kebutuhan / Judul"
                    value={judul}
                    onChange={(e) => setJudul(e.target.value)}
                />

                <Input
                    label="Nominal (Rp)"
                    type="text"
                    inputMode="numeric"
                    value={formatNumber(nominal)}
                    onChange={(e) => setNominal(parseNumber(e.target.value))}
                    placeholder="10.000"
                />

                <Button
                    onClick={handleSave}
                    variant="danger"
                    className="w-full"
                    isLoading={mutation.isPending}
                >
                    Simpan Belanja
                </Button>
            </div>

            {/* Confirmation Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onConfirm={() => mutation.mutate()}
                title="Konfirmasi"
                description="Simpan data belanja ke sistem?"
                type="confirm"
                confirmLabel={mutation.isPending ? "Menyimpan..." : "Ya, Simpan"}
            />

            {/* Success Modal */}
            <Modal
                isOpen={successModal}
                onClose={() => { setSuccessModal(false); navigate('/'); }}
                title="Berhasil"
                description="Data belanja berhasil disimpan!"
                type="success"
            />

            {/* Error Modal */}
            <Modal
                isOpen={errorModal.open}
                onClose={() => setErrorModal({ open: false, message: '' })}
                title="Gagal"
                description={errorModal.message}
                type="error"
            />
        </div>
    );
}
