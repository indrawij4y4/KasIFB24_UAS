// API Configuration for Laravel Backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://kas-ifb-24-uas.vercel.app/api';

// Token management
const getToken = (): string | null => localStorage.getItem('auth_token');
const setToken = (token: string): void => localStorage.setItem('auth_token', token);
const removeToken = (): void => localStorage.removeItem('auth_token');

// Base fetch wrapper with authentication
async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();

    const headers: HeadersInit = {
        'Accept': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    if (!(options.body instanceof FormData)) {
        // @ts-ignore - HeadersInit type is tricky with specific keys, but this is safe
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
}

// Types
export interface User {
    id: number;
    nim: string;
    nama: string;
    role: 'admin' | 'user';
    needs_password_change: boolean;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface Student {
    id: number;
    nim: string;
    nama?: string;  // From Laravel API
    name?: string;  // For frontend components
    m1: number;
    m2: number;
    m3: number;
    m4: number;
    m5: number;
}

export interface LeaderboardItem {
    nim: string;
    nama: string;
    total_amount: number;
    payment_count: number;
}
export interface Transaction {
    id: number;
    judul: string;
    nominal: number;
    tanggal: string;
    foto_url?: string;
}

export interface DashboardStats {
    balance: number;
    total_income: number;
    income_this_month: number;
    expense_this_month: number;
    arrears_count: number;
}

export interface Settings {
    weekly_fee: number;
    weeks_per_month: number;
    is_configured?: boolean;
}

export interface ArrearsItem {
    id: number;
    nim: string;
    nama: string;
    unpaid_weeks: number[];
    total_unpaid: number;
}

// Auth API
export const authApi = {
    login: async (nim: string, password: string): Promise<LoginResponse> => {
        const response = await apiFetch<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ nim, password }),
        });
        setToken(response.token);
        return response;
    },

    logout: async (): Promise<void> => {
        try {
            await apiFetch('/auth/logout', { method: 'POST' });
        } finally {
            removeToken();
        }
    },

    me: async (): Promise<User> => {
        return apiFetch<User>('/auth/me');
    },

    changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
        await apiFetch('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirmation: newPassword,
            }),
        });
    },

    resetPassword: async (userId: number): Promise<void> => {
        await apiFetch('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId }),
        });
    },

    hasToken: (): boolean => !!getToken(),
    clearToken: removeToken,
};

// Dashboard API
export const dashboardApi = {
    getStats: async (): Promise<DashboardStats> => {
        return apiFetch<DashboardStats>('/dashboard/stats');
    },
};

// Pemasukan (Income) API
export const pemasukanApi = {
    getMatrix: async (bulan: number, tahun: number): Promise<Student[]> => {
        return apiFetch<Student[]>(`/pemasukan/matrix?bulan=${bulan}&tahun=${tahun}`);
    },

    getMyPayments: async () => {
        return apiFetch('/pemasukan/my-payments');
    },

    bulkStore: async (data: {
        user_id: number;
        bulan: number;
        tahun: number;
        minggu_ke?: number; // Optional: Pay specific week fully
    }) => {
        return apiFetch('/pemasukan/bulk', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    store: async (data: {
        user_id: number;
        bulan: number;
        tahun: number;
        minggu_ke: number;
        nominal: number;
    }) => {
        return apiFetch('/pemasukan', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    update: async (id: number, nominal: number) => {
        return apiFetch(`/pemasukan/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ nominal }),
        });
    },

    delete: async (id: number) => {
        return apiFetch(`/pemasukan/${id}`, { method: 'DELETE' });
    },

    getList: async (bulan: number, tahun: number) => {
        const response = await apiFetch<{ data: any[] }>(`/pemasukan?bulan=${bulan}&tahun=${tahun}`);
        return response.data || [];
    },
};

// Pengeluaran (Expense) API
export const pengeluaranApi = {
    getAll: async (bulan?: number, tahun?: number) => {
        let url = '/pengeluaran';
        if (bulan && tahun) {
            url += `?bulan=${bulan}&tahun=${tahun}`;
        }
        return apiFetch(url);
    },

    getById: async (id: number): Promise<Transaction> => {
        return apiFetch<Transaction>(`/pengeluaran/${id}`);
    },

    store: async (data: FormData) => {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/pengeluaran`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: data, // FormData for file upload
        });
        if (!response.ok) throw new Error('Failed to store pengeluaran');
        return response.json();
    },

    delete: async (id: number) => {
        return apiFetch(`/pengeluaran/${id}`, { method: 'DELETE' });
    },

    update: async (id: number, data: FormData) => {
        const token = getToken();
        // Append _method for Laravel to recognize as PUT request
        data.append('_method', 'PUT');
        const response = await fetch(`${API_BASE_URL}/pengeluaran/${id}`, {
            method: 'POST', // Use POST with _method=PUT for FormData
            headers: {
                Accept: 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: data,
        });
        if (!response.ok) throw new Error('Failed to update pengeluaran');
        return response.json();
    },
};

// Arrears API
export const arrearsApi = {
    getArrears: async (bulan: number, tahun: number): Promise<{ data: ArrearsItem[] }> => {
        return apiFetch(`/arrears?bulan=${bulan}&tahun=${tahun}`);
    },
};

// Leaderboard API
export const leaderboardApi = {
    getLeaderboard: async (): Promise<LeaderboardItem[]> => {
        return apiFetch<LeaderboardItem[]>('/leaderboard');
    },
};

// Settings API
export const settingsApi = {
    getSettings: async (): Promise<Settings> => {
        return apiFetch<Settings>('/settings');
    },

    updateSettings: async (settings: Settings): Promise<Settings> => {
        return apiFetch<Settings>('/settings', {
            method: 'PUT',
            body: JSON.stringify(settings),
        });
    },
};

// Users API (Admin)
export const usersApi = {
    getAll: async (): Promise<User[]> => {
        return apiFetch<User[]>('/users');
    },

    getById: async (id: number) => {
        return apiFetch(`/users/${id}`);
    },
};

// Export API
export const exportApi = {
    downloadGlobal: (format: 'pdf' | 'excel', bulan: number, tahun: number): string => {
        const token = getToken();
        return `${API_BASE_URL}/export/global?format=${format}&bulan=${bulan}&tahun=${tahun}&token=${token}`;
    },

    downloadPersonal: (format: 'pdf' | 'excel', bulan?: number, tahun?: number): string => {
        const token = getToken();
        let url = `${API_BASE_URL}/export/personal?format=${format}&token=${token}`;
        if (bulan && tahun) {
            url += `&bulan=${bulan}&tahun=${tahun}`;
        }
        return url;
    },

    downloadPengeluaran: (format: 'pdf' | 'excel', bulan: number, tahun: number): string => {
        const token = getToken();
        return `${API_BASE_URL}/export/pengeluaran?format=${format}&bulan=${bulan}&tahun=${tahun}&token=${token}`;
    },
};

// Legacy API compatibility layer (for existing components)
// This maps Laravel API responses to the format expected by frontend components
export const api = {
    getStats: async () => {
        const stats = await dashboardApi.getStats();
        // Map snake_case to camelCase for existing components
        return {
            balance: stats.balance,
            totalIncome: stats.total_income,
            incomeThisMonth: stats.income_this_month,
            expenseThisMonth: stats.expense_this_month,
            arrearsCount: stats.arrears_count,
        };
    },

    getStudents: async (bulan: number, tahun: number): Promise<Student[]> => {
        const data = await pemasukanApi.getMatrix(bulan, tahun);
        // Map 'nama' to 'name' for frontend compatibility
        return data.map((s: any) => ({
            id: s.id,
            nim: s.nim,
            name: s.nama || s.name, // Support both field names
            m1: s.m1 || 0,
            m2: s.m2 || 0,
            m3: s.m3 || 0,
            m4: s.m4 || 0,
            m5: s.m5 || 0,
        }));
    },

    getLeaderboard: async () => {
        const data = await leaderboardApi.getLeaderboard();
        // Map to legacy format
        return data.map(item => ({
            nim: item.nim,
            name: item.nama,
            amount: item.total_amount,
            count: item.payment_count,
        }));
    },

    getTransactions: async (bulan?: number, tahun?: number) => {
        const response = await pengeluaranApi.getAll(bulan, tahun);
        const data = (response as any).data || response || [];
        // Map backend pengeluaran to frontend Transaction format
        return Array.isArray(data) ? data.map((t: any) => {
            // Format date to Indonesian locale (e.g., "3 Jan 2026")
            let formattedDate = t.tanggal;
            try {
                const dateObj = new Date(t.tanggal);
                if (!isNaN(dateObj.getTime())) {
                    formattedDate = dateObj.toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    });
                }
            } catch (e) {
                // Keep original if parsing fails
            }

            return {
                id: t.id,
                title: t.judul,
                date: formattedDate,
                createdAt: t.created_at, // Map full timestamp
                category: 'Pengeluaran',
                amount: Math.round(Number(t.nominal) || 0), // Ensure integer
                type: 'expense' as const,
            };
        }) : [];
    },

    getArrears: async (bulan: number, tahun: number) => {
        const result = await arrearsApi.getArrears(bulan, tahun);
        // Map to legacy Student format with 'name' field
        return result.data.map(item => ({
            id: item.id,
            nim: item.nim,
            name: item.nama, // Map nama -> name
            m1: 0, m2: 0, m3: 0, m4: 0, m5: 0,
            unpaid_weeks: item.unpaid_weeks,
            total_unpaid: item.total_unpaid, // Use backend calculated total
        }));
    },

    getSettings: async (month?: number, year?: number) => {
        // Forward period params if present
        let url = '/settings';
        const params = new URLSearchParams();
        if (month) params.append('month', month.toString());
        if (year) params.append('year', year.toString());

        const queryString = params.toString();
        if (queryString) {
            url += `?${queryString}`;
        }

        const settings = await apiFetch<Settings>(url);
        return {
            weeklyFee: settings.weekly_fee,
            weeksPerMonth: settings.weeks_per_month,
            is_configured: settings.is_configured,
        };
    },

    updateSettings: async (settings: { weeklyFee: number; weeksPerMonth: number; month?: number; year?: number }) => {
        const payload: any = {
            weekly_fee: settings.weeklyFee,
            weeks_per_month: settings.weeksPerMonth,
        };

        if (settings.month) payload.month = settings.month;
        if (settings.year) payload.year = settings.year;

        const result = await settingsApi.updateSettings(payload as Settings);
        return {
            weeklyFee: result.weekly_fee,
            weeksPerMonth: result.weeks_per_month,
        };
    },

    resetAllData: async () => {
        return apiFetch('/reset-data', { method: 'POST' });
    },
};

