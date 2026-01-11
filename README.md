# 💰 Kas IFB24

Platform pencatatan dan monitoring kas kelas yang akurat, transparan, dan dapat diakses oleh seluruh anggota kelas IFB24


![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?style=flat&logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-06B6D4?style=flat&logo=tailwindcss&logoColor=white)



🔗 **Live Demo:** 
- **Frontend:** [https://indrawij4y4.github.io/KasIFB24_UAS/](https://indrawij4y4.github.io/KasIFB24_UAS/)
- **API Backend:** [https://kas-ifb-24-uas.vercel.app/api](https://kas-ifb-24-uas.vercel.app/api)

## 🌐 Deployment

| Layer | Platform | URL |
|-------|----------|-----|
| Frontend | GitHub Pages | https://indrawij4y4.github.io/KasIFB24_UAS/ |
| Backend API | Vercel (PHP Serverless) | https://kas-ifb-24-uas.vercel.app/api |
| Database | TiDB Cloud (Serverless) | Singapore Region |

## 📋 Fitur

- ✅ **Monitoring Kas** - Pantau saldo terkini dan riwayat transaksi real-time
- ✅ **Matrix Pembayaran** - Lihat status pembayaran mingguan per mahasiswa
- ✅ **Leaderboard** - Top kontributor berdasarkan jumlah pembayaran
- ✅ **Laporan Tunggakan** - Daftar mahasiswa dengan tunggakan
- ✅ **Export Laporan** - Download laporan dalam format PDF/Excel
- ✅ **Multi-role** - Akses berbeda untuk Admin dan User

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Laravel 12, PHP 8.2+, MySQL 8.0+ |
| Frontend | React 19, TypeScript, Vite, TailwindCSS |
| Auth | Laravel Sanctum |
| Export | Maatwebsite Excel, DomPDF |

## 🚀 Quick Start

### Prerequisites
- PHP 8.2+
- Composer
- Node.js 18+
- MySQL 8.0+

### Backend Setup

```bash
# Install PHP dependencies
composer install

# Setup environment
cp .env.example .env
php artisan key:generate

# Configure database in .env, then run migrations
php artisan migrate
php artisan db:seed
php artisan storage:link

# Start server
php artisan serve
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

## 📁 Project Structure

```
kas-ifb24/
├── app/                    # Laravel application
│   ├── Exports/           # Excel/PDF export classes
│   ├── Http/Controllers/  # API controllers
│   └── Models/            # Eloquent models
├── database/
│   ├── migrations/        # Database migrations
│   └── seeders/           # Database seeders
├── routes/
│   └── api.php            # API routes
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── features/      # Feature-based screens
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript types
│   └── public/
└── README.md
```

## 🔑 Default Login

| Role | NIM | Password |
|------|-----|----------|
| Admin | 240602036 | (sama dengan NIM) |
| Admin | 240602035 | (sama dengan NIM) |
| User | NIM masing-masing | (sama dengan NIM) |

> ⚠️ User akan diminta mengganti password saat login pertama kali.

## 📚 API Documentation

Lihat dokumentasi API lengkap di bagian bawah file ini atau di [api.php](routes/api.php).

### Main Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/pemasukan/matrix` | Payment matrix |
| GET | `/api/arrears` | Arrears list |
| GET | `/api/leaderboard` | Top contributors |

## 👥 Contributors

- **Indra Wijaya** - 240602036 (Admin)
- **Hanniati Dwi Lestari** - 240602035 (Admin)

## 📄 License

This project is created for educational purposes - Kelas IFB24.
