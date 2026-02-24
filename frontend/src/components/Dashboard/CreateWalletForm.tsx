import { useState } from 'react';

interface CreateWalletFormProps {
    onCreate: (name: string) => Promise<void>;
}

export function CreateWalletForm({ onCreate }: CreateWalletFormProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [newWalletName, setNewWalletName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWalletName.trim()) return;

        await onCreate(newWalletName);
        setNewWalletName('');
        setIsCreating(false);
    };

    if (!isCreating) {
        return (
            <button className="btn-primary" onClick={() => setIsCreating(true)}>
                + Generate New Wallet
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="glass-container" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', maxWidth: '500px' }}>
            <input
                type="text"
                className="input-premium"
                placeholder="Wallet Name (e.g. Savings)"
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                autoFocus
                required
            />
            <button className="btn-primary" type="submit">Create</button>
            <button
                type="button"
                onClick={() => setIsCreating(false)}
                style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
            >
                Cancel
            </button>
        </form>
    );
}
