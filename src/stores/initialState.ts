export const transactionsInitialState = {
    transactions: [],
    allTransactions: [],
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth(),
    isLoading: false,
}

export const budgetsInitialState = {
    activeBudget: null,
    allBudgets: [],
    categories: ['food', 'entertainment', 'travel', 'shopping', 'utilities', 'social life', 'others'],
    accounts: ['cash', 'bank', 'credit card', 'upi'],
    isLoading: false,
}