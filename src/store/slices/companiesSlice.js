import { createSlice, nanoid } from '@reduxjs/toolkit';
import { companies as initial } from '../../data/mockCompanies';

const companiesSlice = createSlice({
  name: 'companies',
  initialState: { items: initial },
  reducers: {
    addCompany: (state, { payload }) => {
      state.items.push({
        id: `co-${nanoid(6)}`,
        rating: 0,
        activeContracts: 0,
        totalSpent: 0,
        lastService: null,
        documents: [],
        serviceHistory: [],
        ...payload,
      });
    },
    updateCompany: (state, { payload }) => {
      const i = state.items.findIndex((c) => c.id === payload.id);
      if (i !== -1) state.items[i] = { ...state.items[i], ...payload };
    },
    deleteCompany: (state, { payload }) => {
      state.items = state.items.filter((c) => c.id !== payload);
    },
  },
});

export const { addCompany, updateCompany, deleteCompany } = companiesSlice.actions;
export const selectCompanies   = (s) => s.companies.items;
export const selectCompanyById = (id) => (s) => s.companies.items.find((c) => c.id === id);
export default companiesSlice.reducer;
