import { createSlice, nanoid } from '@reduxjs/toolkit';
import { expenses as initial } from '../../data/mockExpenses';

const expensesSlice = createSlice({
  name: 'expenses',
  initialState: { items: initial },
  reducers: {
    addExpense: (state, { payload }) => {
      state.items.push({
        id: `exp-${nanoid(6)}`,
        date: new Date().toISOString().split('T')[0],
        ...payload,
      });
    },
    updateExpense: (state, { payload }) => {
      const i = state.items.findIndex((e) => e.id === payload.id);
      if (i !== -1) state.items[i] = { ...state.items[i], ...payload };
    },
    deleteExpense: (state, { payload }) => {
      state.items = state.items.filter((e) => e.id !== payload);
    },
  },
});

export const { addExpense, updateExpense, deleteExpense } = expensesSlice.actions;
export const selectExpenses = (s) => s.expenses.items;
export default expensesSlice.reducer;
