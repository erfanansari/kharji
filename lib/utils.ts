// Format number with commas
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(Math.round(num));
}

// Convert Gregorian to Jalali/Persian (Farsi) date
export function formatToFarsiDate(dateStr: string): string {
  const date = new Date(dateStr);
  const formatter = new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return formatter.format(date);
}

export const categories = [
  // Housing
  { value: "Rent", label: "Rent", labelFa: "اجاره" },
  { value: "Utilities", label: "Utilities", labelFa: "قبوض" },

  // Food (split)
  { value: "Groceries", label: "Groceries", labelFa: "خواربار" },
  { value: "Coffee", label: "Coffee", labelFa: "رستوران و کافه" }, // Includes coffee

  // Daily
  { value: "Transport", label: "Transport", labelFa: "حمل‌ و نقل" }, // Local only
  { value: "Healthcare", label: "Healthcare", labelFa: "بهداشت و درمان" },
  { value: "Clothing", label: "Clothing", labelFa: "پوشاک" },

  // Lifestyle
  { value: "Entertainment", label: "Entertainment", labelFa: "سرگرمی" },
  { value: "Travel", label: "Travel", labelFa: "سفر" }, // ALL travel expenses

  // Financial
  { value: "Investment", label: "Investment", labelFa: "سرمایه‌گذاری" },

  // Work
  { value: "Work", label: "Work", labelFa: "کار" },

  // Misc
  { value: "Other", label: "Other", labelFa: "سایر" },
];

export function getCategoryLabel(category: string): { en: string; fa: string } {
  const cat = categories.find(c => c.value === category);
  return cat ? { en: cat.label, fa: cat.labelFa } : { en: category, fa: category };
}
