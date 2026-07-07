import { createSlice, nanoid } from '@reduxjs/toolkit';
import { contracts as initial } from '../../data/mockContracts';

const contractsSlice = createSlice({
  name: 'contracts',
  initialState: { items: initial },
  reducers: {
    addContract: (state, { payload }) => {
      state.items.push({
        id: `cnt-${nanoid(6)}`,
        status: 'active',
        autoRenew: false,
        includedServices: [],
        documents: [],
        ...payload,
      });
    },
    updateContract: (state, { payload }) => {
      const i = state.items.findIndex((c) => c.id === payload.id);
      if (i !== -1) state.items[i] = { ...state.items[i], ...payload };
    },
    deleteContract: (state, { payload }) => {
      state.items = state.items.filter((c) => c.id !== payload);
    },
  },
});

export const { addContract, updateContract, deleteContract } = contractsSlice.actions;

const pid = (s) => s.properties?.currentId ?? 'prop-default';

export const selectContracts          = (s) => (s.contracts.items ?? []).filter((c) => (c.propertyId || 'prop-default') === pid(s));
export const selectContractById       = (id) => (s) => (s.contracts.items ?? []).find((c) => c.id === id);
export const selectContractsByCompany = (companyId) => (s) => (s.contracts.items ?? []).filter((c) => c.companyId === companyId && (c.propertyId || 'prop-default') === pid(s));

export default contractsSlice.reducer;
