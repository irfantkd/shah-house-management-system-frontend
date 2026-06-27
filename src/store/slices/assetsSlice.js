import { createSlice, nanoid } from '@reduxjs/toolkit';
import { assets as initial } from '../../data/mockAssets';

const assetsSlice = createSlice({
  name: 'assets',
  initialState: { items: initial },
  reducers: {
    addAsset: (state, { payload }) => {
      state.items.push({
        id: `ast-${nanoid(6)}`,
        documents: [],
        serviceHistory: [],
        ...payload,
        warranty: {
          provider: '',
          phone: '',
          policyNumber: '',
          type: 'Parts & Labor',
          coverage: '',
          startDate: '',
          expiryDate: '',
          ...(payload.warranty ?? {}),
        },
      });
    },
    updateAsset: (state, { payload }) => {
      const i = state.items.findIndex((a) => a.id === payload.id);
      if (i !== -1) state.items[i] = { ...state.items[i], ...payload };
    },
    deleteAsset: (state, { payload }) => {
      state.items = state.items.filter((a) => a.id !== payload);
    },
  },
});

export const { addAsset, updateAsset, deleteAsset } = assetsSlice.actions;
export const selectAssets  = (s) => s.assets.items;
export const selectAssetById = (id) => (s) => s.assets.items.find((a) => a.id === id);
export default assetsSlice.reducer;
