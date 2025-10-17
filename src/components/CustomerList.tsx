import { Customer } from '../lib/supabase';
import { Trash2 } from 'lucide-react';

interface CustomerListProps {
  customers: Customer[];
  onDelete: (id: string) => void;
}

export default function CustomerList({ customers, onDelete }: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        Henüz müşteri verisi yok
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-128 overflow-y-auto">
      {customers.map((customer) => (
        <div
          key={customer.id}
          className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1 space-y-1">
              {customer.site_configurations?.site_name && (
                <div className="text-xs font-medium text-blue-600 mb-1">
                  {customer.site_configurations.site_name}
                </div>
              )}
              {customer.full_name && (
                <div className="font-medium text-gray-900">{customer.full_name}</div>
              )}
              {customer.email && (
                <div className="text-xs text-gray-600">{customer.email}</div>
              )}
              {customer.phone && (
                <div className="text-xs text-gray-600">{customer.phone}</div>
              )}
              {customer.address && (
                <div className="text-xs text-gray-500 truncate">{customer.address}</div>
              )}
            </div>
            <button
              onClick={() => onDelete(customer.id)}
              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Sil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
