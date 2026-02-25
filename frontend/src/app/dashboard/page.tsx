"use client";

import { useDashboardWallets } from '../../hooks/useDashboardWallets';
import { WalletDetailsModal } from '../../components/Dashboard/WalletDetailsModal';
import { DashboardHeader } from '../../components/Dashboard/DashboardHeader';
import { CreateWalletForm } from '../../components/Dashboard/CreateWalletForm';
import { WalletCard } from '../../components/Dashboard/WalletCard';

export default function Dashboard() {
    const {
        wallets,
        isLoading,
        syncCountdown,
        selectedWallet,
        selectedWalletBalance,
        selectedWalletLoading,
        selectedWalletHistory,
        ltcUsdRate,
        openWalletDetails,
        closeWalletDetails,
        handleSendLTC,
        handleCreateWallet,
        handleDeleteWallet,
        submitEditWallet,
        handleLogout
    } = useDashboardWallets();

    if (isLoading) {
        return (
            <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Decrypting Vault Data...</p>
            </main>
        );
    }

    return (
        <main style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

                <DashboardHeader onLogout={handleLogout} />

                <div style={{ marginBottom: '2rem' }}>
                    <CreateWalletForm onCreate={handleCreateWallet} />
                </div>

                {wallets.length === 0 ? (
                    <div className="glass-container" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>No wallets found in this vault.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: '2rem', background: 'var(--glass-bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Next Network Sync Process</span>
                                <span style={{ color: 'var(--primary-accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{syncCountdown}s</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(syncCountdown / 120) * 100}%`, height: '100%', background: 'linear-gradient(90deg, transparent, var(--primary-accent))', transition: 'width 1s linear', boxShadow: '0 0 10px var(--primary-accent)' }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {wallets.map((wallet) => (
                                <WalletCard
                                    key={wallet.id}
                                    wallet={wallet}
                                    usdRate={ltcUsdRate}
                                    onEditSubmit={submitEditWallet}
                                    onDelete={handleDeleteWallet}
                                    onOpenDetails={openWalletDetails}
                                />
                            ))}
                        </div>
                    </>
                )}

            </div>

            {selectedWallet && (
                <WalletDetailsModal
                    wallet={selectedWallet}
                    balance={selectedWalletBalance}
                    history={selectedWalletHistory}
                    isLoading={selectedWalletLoading}
                    onClose={closeWalletDetails}
                    onSendLTC={handleSendLTC}
                    usdRate={ltcUsdRate}
                />
            )}
        </main>
    );
}
