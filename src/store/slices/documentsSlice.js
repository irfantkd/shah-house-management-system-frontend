import { createSlice, nanoid } from '@reduxjs/toolkit';
import { documents as initial } from '../../data/mockDocuments';

const documentsSlice = createSlice({
  name: 'documents',
  initialState: { items: initial },
  reducers: {
    addDocument: (state, { payload }) => {
      state.items.push({
        id: `doc-${nanoid(6)}`,
        date: new Date().toISOString().split('T')[0],
        type: 'pdf',
        size: '0.0 MB',
        ...payload,
      });
    },
    updateDocument: (state, { payload }) => {
      const i = state.items.findIndex((d) => d.id === payload.id);
      if (i !== -1) state.items[i] = { ...state.items[i], ...payload };
    },
    deleteDocument: (state, { payload }) => {
      state.items = state.items.filter((d) => d.id !== payload);
    },
  },
});

export const { addDocument, updateDocument, deleteDocument } = documentsSlice.actions;

const pid = (s) => s.properties?.currentId ?? 'prop-default';
export const selectDocuments = (s) => (s.documents.items ?? []).filter((d) => (d.propertyId || 'prop-default') === pid(s));

export default documentsSlice.reducer;
