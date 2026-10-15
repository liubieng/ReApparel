import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { ClothingItem } from '../../shared/types/database';

interface DeleteCascadeModalProps {
  garment: ClothingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (itemId: number) => Promise<void>;
}

// Modal dialog confirming permanent garment deletion and cascading cleanup
export const DeleteCascadeModal: React.FC<DeleteCascadeModalProps> = ({
  garment,
  isOpen,
  onClose,
  onConfirmDelete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !garment) return null;

  // Dispatches garment deletion to remove item and dependent records
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete(garment.item_id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modalScrim" onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) onClose(); }}>
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
          Are you sure you want to delete <strong>"{garment.name}"</strong>? This will permanently delete all records of this clothing.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-g" disabled={isDeleting} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-p"
            disabled={isDeleting}
            style={{ background: 'var(--danger)', borderColor: 'var(--danger)', opacity: isDeleting ? 0.7 : 1 }}
            onClick={handleDelete}
          >
            <Trash2 className="ico" style={{ width: 13, height: 13 }} />
            <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Item'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
