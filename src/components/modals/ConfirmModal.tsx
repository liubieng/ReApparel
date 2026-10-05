import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  requiredConfirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Proceed',
  requiredConfirmText,
  onConfirm,
  onCancel
}) => {
  const [inputText, setInputText] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setInputText('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requiredConfirmText) {
      if (inputText.trim() !== requiredConfirmText) {
        setErrorMsg(`Confirmation text does not match. Please type "${requiredConfirmText}" to proceed.`);
        return;
      }
    }
    setErrorMsg(null);
    onConfirm();
  };

  const handleCancel = () => {
    setInputText('');
    setErrorMsg(null);
    onCancel();
  };

  return (
    <div className="modalScrim" onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}>
      <div className="modal" style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--font-display)' }}>{title}</h3>
          <button type="button" className="icobtn" onClick={handleCancel} aria-label="Close dialog">
            <X className="ico" />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 16px' }}>
          {message}
        </p>

        {requiredConfirmText && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              Type <span style={{ color: 'var(--danger)', fontFamily: 'monospace', fontWeight: 700 }}>{requiredConfirmText}</span> to confirm:
            </label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder={`Type "${requiredConfirmText}"`}
              style={{
                width: '100%',
                fontSize: 13,
                padding: '8px 12px',
                borderRadius: 8,
                border: errorMsg ? '1px solid var(--danger)' : '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--text)'
              }}
              autoFocus
            />
            {errorMsg && (
              <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6, fontWeight: 500 }}>
                {errorMsg}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-g" onClick={handleCancel}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-p" 
            style={requiredConfirmText ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' } : undefined}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
