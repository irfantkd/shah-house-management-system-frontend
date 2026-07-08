import { createSlice } from '@reduxjs/toolkit';

const letterheadsSlice = createSlice({
  name: 'letterheads',
  initialState: { records: [] },
  reducers: {
    saveLetterhead(state, action) {
      state.records.unshift(action.payload);
    },
    deleteLetterhead(state, action) {
      state.records = state.records.filter((r) => r.id !== action.payload);
    },
  },
});

export const { saveLetterhead, deleteLetterhead } = letterheadsSlice.actions;
export const selectLetterheads = (s) => s.letterheads?.records ?? [];
export default letterheadsSlice.reducer;
