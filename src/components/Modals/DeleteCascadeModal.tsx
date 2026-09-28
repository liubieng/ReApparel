import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { ClothingItem } from '../../types/database';

interface DeleteCascadeModalProps {
  garment: ClothingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (itemId: number) => Promise<void>;
}

export const DeleteCascadeModal: React.FC<DeleteCascadeModalProps> = ({
  garment,
  isOpen,
  onClose,
  onConfirmDelete
}) => {
  if (!isOpen || !garment) return null;

  return (
    <div className="modalScrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle style={{ width: 20, height: 20 }} />
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--font-display)' }}>
            Delete Clothing Item?
          </h3>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 16px' }}>
          Are you sure you want to remove <strong>"{garment.name}"</strong>? In compliance with relational database integrity (PostgreSQL Cascade Rules), removing this garment will also clean up associated daily logs and loan references.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-g" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-p"
            style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={() => onConfirmDelete(garment.item_id)}
          >
            <Trash2 className="ico" style={{ width: 13, height: 13 }} />
            <span>Yes, Delete Item</span>
          </button>
        </div>
      </div>
    </div>
  );
};
