import React, { useState, useEffect } from 'react';
import { SubmittedSale, SaleItemRecord, PaymentMethod } from '../types';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { SaleItemRow } from '@/components/SaleItemRow'; // Re-using SaleItemRow for editing
import { useLanguage } from '../contexts/LanguageContext';

interface EditSaleModalProps {
  sale: SubmittedSale;
  onClose: () => void;
  onSave: (updatedSale: SubmittedSale) => void;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({ sale, onClose, onSave }) => {
  const { t } = useLanguage();
  const [editedSale, setEditedSale] = useState<SubmittedSale>(sale);

  useEffect(() => {
    // Recalculate total amount whenever items or discounts change
    const newTotalAmount = editedSale.items.reduce((sum, item) => {
      const unitPrice = item.unitPrice || 0;
      const quantity = item.quantity || 0;
      const discount = item.discount || 0;
      return sum + (unitPrice * quantity - discount);
    }, 0);
    setEditedSale(prev => ({ ...prev, totalAmount: newTotalAmount }));
  }, [editedSale.items]);

  const handleItemUpdate = (index: number, updatedItem: SaleItemRecord) => {
    setEditedSale(prev => {
      const newItems = [...prev.items];
      newItems[index] = updatedItem;
      return { ...prev, items: newItems };
    });
  };

  const handleItemRemove = (index: number) => {
    setEditedSale(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: newItems };
    });
  };

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditedSale(prev => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }));
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedSale(prev => ({ ...prev, notes: e.target.value }));
  };

  const paymentMethodOptions = Object.values(PaymentMethod).map(method => ({
    value: method,
    label: t(`paymentMethods.${method}`),
  }));

  return (
    <Modal isOpen={true} onClose={onClose} title={t('editSaleModal.title', { saleId: sale.id.substring(0, 8) })}> 
      <div className="p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">{t('common.date')}:</label>
          <p className="mt-1 text-sm text-gray-900">{new Date(editedSale.submissionDate).toLocaleString()}</p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">{t('salesHistory.submittedBy')}:</label>
          <p className="mt-1 text-sm text-gray-900">{editedSale.submitted_by_username || 'N/A'}</p>
        </div>

        <div className="mb-4">
          <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">{t('common.paymentMethod')}:</label>
          <Select
            id="paymentMethod"
            value={editedSale.paymentMethod}
            onChange={handlePaymentMethodChange}
            options={paymentMethodOptions}
            className="mt-1 block w-full"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">{t('common.notes')}:</label>
          <Input
            id="notes"
            type="text"
            value={editedSale.notes || ''}
            onChange={handleNotesChange}
            className="mt-1 block w-full"
            placeholder={t('editSaleModal.notesPlaceholder')}
          />
        </div>

        <h3 className="text-lg font-medium text-gray-900 mb-3">{t('editSaleModal.items')}:</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.title')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.image')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.code')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.size')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.quantity')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.price')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.discount')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.total')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {editedSale.items.map((item, index) => (
                <SaleItemRow
                  key={index} // Using index as key for now, consider unique item IDs if available
                  item={item}
                  index={index}
                  onUpdateItem={handleItemUpdate}
                  onRemoveItem={handleItemRemove}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-right text-xl font-bold text-indigo-600">
          {t('common.total')}: €{editedSale.totalAmount.toFixed(2)}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={() => onSave(editedSale)}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};