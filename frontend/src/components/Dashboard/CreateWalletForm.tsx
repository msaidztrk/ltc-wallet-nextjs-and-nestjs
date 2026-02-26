import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface CreateWalletFormProps {
    onCreate: (name: string) => Promise<void>;
}

export function CreateWalletForm({ onCreate }: CreateWalletFormProps) {
    const { t } = useTranslation();
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
                + {t('btn_create')}
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="glass-container" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', maxWidth: '500px' }}>
            <input
                type="text"
                className="input-premium"
                placeholder={t('create_vault_placeholder')}
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                autoFocus
                required
            />
            <button className="btn-primary" type="submit">{t('btn_create').split(' ')[0]}</button>
            <button
                type="button"
                onClick={() => setIsCreating(false)}
                style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
            >
                {t('cancel')}
            </button>
        </form>
    );
}
