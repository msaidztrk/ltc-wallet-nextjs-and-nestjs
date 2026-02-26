# 🛡️ Litecoin Web Vault (LTC-Web-Vault)

A high-performance, secure, and minimalist Litecoin wallet application built with **Next.js 15**, **NestJS**, and **Supabase**. Securely manage your LTC assets with encrypted mnemonics and real-time blockchain synchronization.

![Litecoin Web Vault](https://img.shields.io/badge/Blockchain-Litecoin-blue?style=for-the-badge&logo=litecoin)
![Tech Stack](https://img.shields.io/badge/Stack-Next.js%20|%20NestJS%20|%20Supabase-green?style=for-the-badge)

---

## ✨ Key Features

- **Multi-Wallet Support:** Create and manage multiple LTC wallets under a single account.
- **Hierarchical Deterministic (HD) Wallets:** Built on `bitcoinjs-lib` for secure key generation.
- **Cloud Encryption:** Your 12-word mnemonics are encrypted with a backend secret before being stored in your private Supabase vault.
- **2FA Transaction Confirmation:** Optional security layer requiring your login password for every transfer.
- **Real-Time Activity:** Live transaction history fetched directly from the blockchain (BlockCypher API).
- **Responsive & Premium Design:** Minimalist dark/light interface with Glassmorphism aesthetics.
- **Global Error Logging:** Centralized backend logging for system stability and debugging.

---

## 🏗️ Architecture Overview

The project follows a decoupled **Client-Server** architecture for maximum security and scalability:

- **Frontend (Next.js 15):** Handles the UI, state management, and interaction with the backend services. Uses `apiClient` pattern for structured communication.
- **Backend (NestJS):** The "Brain" of the operation. Handles encryption, blockchain broadcasting, and provides protected endpoints via JWT.
- **Persistence (Supabase):** Manages user authentication and stores encrypted wallet data with strict **Row Level Security (RLS)**.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm / yarn
- A Supabase account

### 2. Environment Setup
Create a `.env` file in the root directory:

```env
# Encryption - 32 character hex secret for AES
ENCRYPTION_SECRET=your_32_char_secret_here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_or_anon_key

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Database Setup (Supabase)
Run the queries in `backend/supabase-schema.sql` within your Supabase SQL Editor to initialize:
- `wallets` table (with RLS)
- `user_settings` table (for 2FA/Theme preferences)
- `transaction_logs` & `error_logs` tables

### 4. Installation & Running

**Install dependencies:**
```bash
# Root directory
npm install
cd frontend && npm install
cd ../backend && npm install
```

**Start Backend (NestJS):**
```bash
cd backend
npm run start:dev
```

**Start Frontend (Next.js):**
```bash
cd frontend
npm run dev
```

---

## 🔐 Security Standards

- **Zero Plane-Text Mnemonics:** Mnemonics are never stored in plain text.
- **JWT Protection:** All sensitive backend routes are protected by an `AuthMiddleware` that verifies Supabase JWT tokens.
- **Service-Oriented Design:** UI components never talk directly to the database; they communicate via abstracted services (`SettingsService`, `WalletService`).
- **Encrypted Repositories:** Backend uses a dedicated `CryptoService` for AES-256-CBC encryption.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 15, React, Axios, Framer Motion (optional), Lucide Icons.
- **Backend:** NestJS 10, Supabase JS SDK, `bitcoinjs-lib`, `bip39`.
- **Database/Auth:** Supabase (Postgres).
- **API:** BlockCypher (LTC Blockchain).

---

## 📜 Table Schema

| Table | Purpose | RLS Status |
| :--- | :--- | :--- |
| `wallets` | Encrypted keys & addresses | Restricted to Owner |
| `user_settings` | Theme & 2FA preferences | Restricted to Owner |
| `transaction_logs`| Local TX history mirror | Restricted to Owner |
| `error_logs` | System debugging | Restricted to Owner |

---

