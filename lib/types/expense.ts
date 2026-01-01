export interface Tag {
  id: number;
  name: string;
  created_at: string;
}

export interface Expense {
  id: number;
  date: string;
  category: string;
  description: string;
  price_toman: number;
  price_usd: number;
  created_at: string;
  tags?: Tag[];
}

export interface CreateExpenseInput {
  date: string;
  category: string;
  description: string;
  price_toman: number;
  price_usd: number;
  tagIds?: number[];
}
