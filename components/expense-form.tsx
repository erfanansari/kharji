'use client';

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { type CreateExpenseInput, type Tag } from '@/lib/types/expense';
import { categories } from '@/lib/utils';
import { tomanToUsd, usdToToman } from '@/lib/constants';
import { TagInput } from './tag-input';

interface ExpenseFormProps {
  onExpenseAdded: () => void;
  editingExpense?: { id: number; tags?: Tag[] } & CreateExpenseInput;
  onCancelEdit?: () => void;
}

export function ExpenseForm({ onExpenseAdded, editingExpense, onCancelEdit }: ExpenseFormProps) {
  const [formData, setFormData] = useState<CreateExpenseInput>({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    price_toman: 0,
    price_usd: 0,
    tagIds: []
  });
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [lastChanged, setLastChanged] = useState<'toman' | 'usd'>('toman');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isFetchingRate, setIsFetchingRate] = useState(true);

  // Fetch latest exchange rate on mount
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('/api/exchange-rate');
        if (response.ok) {
          const data = await response.json();
          const rate = parseInt(data.usd.value, 10);
          setExchangeRate(rate);

          // Log fetch status
          if (data._meta?.fetchedAt) {
            console.log(`🌐 Exchange rate: ${rate.toLocaleString()} Toman/USD (fetched: ${data._meta.fetchedAt}, cached until: ${data._meta.cachedUntil})`);
          } else {
            console.log(`Exchange rate: ${rate.toLocaleString()} Toman/USD (${data.usd.date})`);
          }
        } else {
          console.warn('Exchange rate API unavailable, user must enter rate manually');
        }
      } catch (error) {
        console.warn('Failed to fetch exchange rate, user must enter rate manually:', error);
      } finally {
        setIsFetchingRate(false);
      }
    };

    fetchExchangeRate();
  }, []);

  // Load editing expense data
  useEffect(() => {
    if (editingExpense) {
      setFormData({
        date: editingExpense.date,
        category: editingExpense.category,
        description: editingExpense.description,
        price_toman: editingExpense.price_toman,
        price_usd: editingExpense.price_usd,
        tagIds: editingExpense.tags?.map(t => t.id) || []
      });
      setSelectedTags(editingExpense.tags || []);
      // Calculate rate from existing data (full Toman value)
      if (editingExpense.price_toman && editingExpense.price_usd) {
        setExchangeRate(Math.round(editingExpense.price_toman / editingExpense.price_usd));
      }
    }
  }, [editingExpense]);

  const handleTomanChange = (value: number) => {
    setFormData({
      ...formData,
      price_toman: value,
      price_usd: tomanToUsd(value, exchangeRate),
    });
    setLastChanged('toman');
  };

  const handleUsdChange = (value: number) => {
    setFormData({
      ...formData,
      price_usd: value,
      price_toman: usdToToman(value, exchangeRate),
    });
    setLastChanged('usd');
  };

  const handleRateChange = (value: number) => {
    setExchangeRate(value);
    // Recalculate based on last changed field
    if (lastChanged === 'toman') {
      setFormData({
        ...formData,
        price_usd: tomanToUsd(formData.price_toman, value),
      });
    } else {
      setFormData({
        ...formData,
        price_toman: usdToToman(formData.price_usd, value),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses';
      const method = editingExpense ? 'PUT' : 'POST';

      // Sync tagIds with selectedTags
      const dataToSubmit = {
        ...formData,
        tagIds: selectedTags.map(t => t.id)
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: editingExpense ? 'Expense updated successfully!' : 'Expense added successfully!'
        });
        setFormData({
          date: new Date().toISOString().split('T')[0],
          category: '',
          description: '',
          price_toman: 0,
          price_usd: 0,
          tagIds: []
        });
        setSelectedTags([]);
        // Keep the fetched exchange rate (don't reset it)
        onExpenseAdded();
        if (editingExpense && onCancelEdit) {
          onCancelEdit();
        }
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save expense' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save expense' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      price_toman: 0,
      price_usd: 0,
    });
    // Keep the fetched exchange rate (don't reset it)
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
          <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {editingExpense ? 'Edit Expense / ویرایش هزینه' : 'Add New Expense / افزودن هزینه جدید'}
          </h2>
        </div>
        {editingExpense && (
          <button
            onClick={handleCancel}
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Category / دسته‌بندی
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select category...</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label} / {cat.labelFa}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Date / تاریخ
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Description / توضیحات
          </label>
          <textarea
            placeholder="Enter expense details..."
            required
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Tags / برچسب‌ها
          </label>
          <TagInput selectedTags={selectedTags} onTagsChange={setSelectedTags} />
        </div>

        {/* Prices and Rate */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Toman */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Price (Toman) / مبلغ (تومان)
            </label>
            <input
              type="number"
              placeholder="60000"
              required
              min="0"
              step="1"
              value={formData.price_toman || ''}
              onChange={(e) => handleTomanChange(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* USD */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Price (USD) / مبلغ (دلار)
            </label>
            <input
              type="number"
              placeholder="0.00"
              required
              min="0"
              step="0.01"
              value={formData.price_usd || ''}
              onChange={(e) => handleUsdChange(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Exchange Rate */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Rate (Toman/USD) / نرخ {isFetchingRate && <span className="text-xs text-zinc-500">(fetching...)</span>}
            </label>
            <input
              type="number"
              placeholder="130100"
              required
              min="1"
              step="1"
              value={exchangeRate || ''}
              onChange={(e) => handleRateChange(parseFloat(e.target.value) || exchangeRate)}
              disabled={isFetchingRate}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-wait"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting || isFetchingRate || !exchangeRate}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            {isFetchingRate ? 'Loading rate...' : isSubmitting ? 'Saving...' : (editingExpense ? 'Update / بروزرسانی' : 'Add / افزودن')}
          </button>
          {editingExpense && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium rounded-md transition-colors"
            >
              Cancel / لغو
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
