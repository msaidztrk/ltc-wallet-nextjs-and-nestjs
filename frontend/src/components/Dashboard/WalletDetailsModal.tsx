import { useState } from 'react';
import { Wallet, TxRef } from '../../types/wallet.types';
import { useFeeCalculator } from '../../hooks/useFeeCalculator';
import { useSettings } from '../../hooks/useSettings';
import { SettingsService } from '../../services/settings.service';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface WalletDetailsModalProps {
    wallet: Wallet;
    balance: string | null;
    history: TxRef[];
    isLoading: boolean;
    onClose: () => void;
    onSendLTC: (address: string, amount: string) => Promise<boolean>;
    usdRate: number | null;
}

export function WalletDetailsModal({ wallet, balance, history, isLoading, onClose, onSendLTC, usdRate }: WalletDetailsModalProps) {
    const [activeTab, setActiveTab] = useState<'history' | 'send'>('history');
    const [sendAddress, setSendAddress] = useState('');
    const [sendAmount, setSendAmount] = useState('');
    const [sendUsdAmount, setSendUsdAmount] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const { settings } = useSettings();



    const {
        estimatedFee,
        isEstimatingFee,
        isCalculating,
        remainingLtcNum,
        sendAmountNum,
        isInsufficientFunds
    } = useFeeCalculator(wallet.public_address, sendAmount, balance);

    const handleLtcChange = (val: string) => {
        setSendAmount(val);
        if (usdRate && val !== '') {
            setSendUsdAmount((parseFloat(val) * usdRate).toFixed(2));
        } else {
            setSendUsdAmount('');
        }
    };

    const handleUsdChange = (val: string) => {
        setSendUsdAmount(val);
        if (usdRate && val !== '') {
            setSendAmount((parseFloat(val) / usdRate).toFixed(8));
        } else {
            setSendAmount('');
        }
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sendAddress || !sendAmount || isInsufficientFunds) return;

        if (settings.require_password_for_tx) {
            setShowPasswordPrompt(true);
        } else {
            await executeSendTransaction();
        }
    };

    const handlePasswordConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Session expired');

            const result = await SettingsService.verifyPassword(session.access_token, confirmPassword);

            if (!result || !result.verified) {
                return;
            }

            setShowPasswordPrompt(false);
            setConfirmPassword('');
            await executeSendTransaction();
        } catch (error: any) {
            console.error('Password verification error');
        } finally {
            setIsVerifying(false);
        }
    };

    const executeSendTransaction = async () => {
        setIsSending(true);
        const success = await onSendLTC(sendAddress, sendAmount);
        if (success) {
            setSendAddress('');
            setSendAmount('');
            setSendUsdAmount('');
            setActiveTab('history');
        }
        setIsSending(false);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
            <div className="glass-container" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >✕</button>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                    {wallet.name} <span style={{ color: 'var(--primary-accent)' }}>Vault</span>
                </h2>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Public Address (LTC)</label>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '4px', wordBreak: 'break-all', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#fff', border: '1px solid var(--glass-border)' }}>
                        {wallet.public_address}
                    </div>
                </div>

                <div style={{ marginBottom: '2.5rem' }}>
                    <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Live Network Balance</label>
                    {isLoading ? (
                        <div style={{ fontSize: '1.2rem', color: 'var(--primary-accent)', fontWeight: 600 }}>Syncing block data...</div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ fontSize: '2.5rem', color: 'var(--primary-accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.5rem', color: '#fff' }}>Ł</span> {balance}
                            </div>
                            {balance && usdRate && (
                                <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 500, background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    ≈ ${(parseFloat(balance) * usdRate).toFixed(2)} USD
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Tabs Navigation */}
                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '1.5rem' }}>
                    <button onClick={() => setActiveTab('history')} style={{ background: 'transparent', border: 'none', color: activeTab === 'history' ? 'var(--primary-accent)' : 'var(--text-muted)', fontWeight: 600, paddingBottom: '0.5rem', cursor: 'pointer', borderBottom: activeTab === 'history' ? '2px solid var(--primary-accent)' : '2px solid transparent', transition: 'all 0.2s' }}>
                        Transaction History
                    </button>
                    <button onClick={() => setActiveTab('send')} style={{ background: 'transparent', border: 'none', color: activeTab === 'send' ? 'var(--primary-accent)' : 'var(--text-muted)', fontWeight: 600, paddingBottom: '0.5rem', cursor: 'pointer', borderBottom: activeTab === 'send' ? '2px solid var(--primary-accent)' : '2px solid transparent', transition: 'all 0.2s' }}>
                        ↗ Send LTC
                    </button>
                </div>

                {/* Transaction History Tab */}
                {activeTab === 'history' && (
                    <div>
                        {isLoading ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                                Loading blockchain records...
                            </div>
                        ) : history.length === 0 ? (
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--glass-border)' }}>
                                <p style={{ color: 'var(--text-muted)', margin: 0 }}>No transactions found for this wallet on the Litecoin network.</p>
                            </div>
                        ) : (
                            <div style={{ background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                        <thead style={{ background: 'rgba(0,0,0,0.7)', position: 'sticky', top: 0, zIndex: 1, backdropFilter: 'blur(10px)' }}>
                                            <tr>
                                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--glass-border)' }}>Type</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--glass-border)' }}>Amount (LTC)</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--glass-border)' }}>Date</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--glass-border)' }}>TX Hash</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.map((tx, index) => {
                                                const isReceived = tx.tx_input_n === -1;
                                                const amount = (tx.value / 100000000).toFixed(8);
                                                const date = tx.confirmed ? new Date(tx.confirmed).toLocaleString() : 'Unconfirmed';
                                                return (
                                                    <tr key={`${tx.tx_hash}-${index}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s', ...(!tx.confirmed ? { opacity: 0.6 } : {}) }}
                                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <td style={{ padding: '1rem' }}>
                                                            <span style={{
                                                                background: isReceived ? 'rgba(202, 255, 51, 0.1)' : 'rgba(255, 107, 107, 0.1)',
                                                                color: isReceived ? 'var(--primary-accent)' : '#ff6b6b',
                                                                padding: '0.3rem 0.6rem',
                                                                borderRadius: '4px',
                                                                fontWeight: 600,
                                                                fontSize: '0.75rem',
                                                                letterSpacing: '0.5px'
                                                            }}>
                                                                {isReceived ? '↓ RECEIVED' : '↑ SENT'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                                            {amount}
                                                        </td>
                                                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                                                            {date}
                                                        </td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <a
                                                                href={`https://live.blockcypher.com/ltc/tx/${tx.tx_hash}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'color 0.2s' }}
                                                                onMouseOver={(e) => { e.currentTarget.style.color = 'var(--primary-accent)'; }}
                                                                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                                                            >
                                                                {tx.tx_hash.substring(0, 8)}...{tx.tx_hash.substring(tx.tx_hash.length - 8)}
                                                                <span style={{ fontSize: '0.7rem' }}>↗</span>
                                                            </a>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Send LTC Tab */}
                {activeTab === 'send' && (
                    <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Recipient LTC Address</label>
                            <input
                                type="text"
                                className="input-premium"
                                value={sendAddress}
                                onChange={(e) => setSendAddress(e.target.value)}
                                placeholder="e.g. ltc1q..."
                                required
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ flex: 1 }}>
                                <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Amount (LTC)</label>
                                <input
                                    type="number"
                                    step="0.00000001"
                                    min="0"
                                    className="input-premium"
                                    value={sendAmount}
                                    onChange={(e) => handleLtcChange(e.target.value)}
                                    placeholder="0.00"
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem', color: 'var(--text-muted)' }}>
                                ⇌
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Expected (USD)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="input-premium"
                                    value={sendUsdAmount}
                                    onChange={(e) => handleUsdChange(e.target.value)}
                                    placeholder="0.00"
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                        {isCalculating && (
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '4px', border: isInsufficientFunds ? '1px solid rgba(255, 107, 107, 0.5)' : '1px solid var(--glass-border)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                    <span>Network Fee (Estimated):</span>
                                    <span>{isEstimatingFee ? 'Calculating...' : estimatedFee !== null ? `${estimatedFee.toFixed(8)} LTC` : 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                    <span>Total Deduction:</span>
                                    <span>{isEstimatingFee ? 'Calculating...' : estimatedFee !== null ? `${(sendAmountNum + estimatedFee).toFixed(8)} LTC` : 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', color: isInsufficientFunds ? '#ff6b6b' : '#fff', fontWeight: 600 }}>
                                    <span>Remaining Balance:</span>
                                    <div style={{ textAlign: 'right' }}>
                                        <div>{isEstimatingFee ? 'Calculating...' : isInsufficientFunds ? 'Insufficient Funds' : `${remainingLtcNum.toFixed(8)} LTC`}</div>
                                        {!isInsufficientFunds && !isEstimatingFee && usdRate && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--primary-accent)', marginTop: '0.2rem', opacity: 0.8 }}>≈ ${(remainingLtcNum * usdRate).toFixed(2)} USD</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        <button type="submit" className="btn-primary" style={{ width: '100%', opacity: isSending || isEstimatingFee || isInsufficientFunds ? 0.7 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} disabled={isSending || isEstimatingFee || isInsufficientFunds || !sendAddress || !sendAmount}>
                            {isSending ? 'Broadcasting Transaction...' : isEstimatingFee ? 'Estimating Fee...' : isInsufficientFunds ? 'Insufficient LTC Balance' : 'Confirm Send Transaction'}
                        </button>
                    </form>
                )}


                {/* Password Confirmation Box (Glassmorphism Overlay) */}
                {showPasswordPrompt && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ width: '100%', maxWidth: '350px', padding: '2rem', textAlign: 'center' }}>
                            <div style={{ marginBottom: '1.5rem', color: 'var(--primary-accent)' }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Confirm Transfer</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Please enter your login password to authorize this LTC transaction.</p>

                            <form onSubmit={handlePasswordConfirm}>
                                <input
                                    type="password"
                                    className="input-premium"
                                    placeholder="Enter your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoFocus
                                    required
                                    style={{ width: '100%', marginBottom: '1rem', textAlign: 'center' }}
                                />
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setShowPasswordPrompt(false); setConfirmPassword(''); }}
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer' }}
                                    >Cancel</button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={isVerifying}
                                        style={{ flex: 2 }}
                                    >{isVerifying ? 'Verifying...' : 'Unlock & Send'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
