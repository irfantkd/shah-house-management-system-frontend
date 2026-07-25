import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchProperties = createAsyncThunk(
  'properties/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/properties');
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to load properties');
    }
  }
);

export const addProperty = createAsyncThunk(
  'properties/add',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/properties', payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to add property');
    }
  }
);

export const updateProperty = createAsyncThunk(
  'properties/update',
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/properties/${id}`, payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to update property');
    }
  }
);

export const deleteProperty = createAsyncThunk(
  'properties/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/properties/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to delete property');
    }
  }
);

export const setCurrentProperty = createAsyncThunk('properties/setCurrent', async (id) => id);

const propertiesSlice = createSlice({
  name: 'properties',
  initialState: { items: [], currentId: null, status: 'idle', error: null },
  reducers: {},
  extraReducers: (b) => {
    b
      .addCase(fetchProperties.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(fetchProperties.fulfilled, (state, { payload }) => {
        state.status = 'succeeded';
        state.items  = payload;
        // Validate that the persisted currentId still exists; fall back to first property if not
        const stillExists = payload.some((p) => p.id === state.currentId);
        if (!stillExists && payload.length > 0) {
          state.currentId = payload[0].id;
        }
      })
      .addCase(fetchProperties.rejected, (state, { payload }) => {
        state.status = 'failed';
        state.error  = payload;
      })
      .addCase(addProperty.fulfilled, (state, { payload }) => {
        state.items.push(payload);
        state.currentId = payload.id;
      })
      .addCase(updateProperty.fulfilled, (state, { payload }) => {
        const i = state.items.findIndex((p) => p.id === payload.id);
        if (i !== -1) state.items[i] = payload;
      })
      .addCase(deleteProperty.fulfilled, (state, { payload: id }) => {
        state.items = state.items.filter((p) => p.id !== id);
        if (state.currentId === id) {
          state.currentId = state.items.length > 0 ? state.items[0].id : null;
        }
      })
      .addCase(setCurrentProperty.fulfilled, (state, { payload }) => {
        if (state.items.find((p) => p.id === payload)) state.currentId = payload;
      });
  },
});

export const selectProperties        = (s) => s.properties?.items ?? [];
export const selectPropertiesStatus  = (s) => s.properties?.status ?? 'idle';
export const selectCurrentPropertyId = (s) => s.properties?.currentId ?? null;
export const selectCurrentProperty   = (s) => {
  const id = s.properties?.currentId;
  return id ? (s.properties?.items ?? []).find((p) => p.id === id) ?? null : null;
};

export default propertiesSlice.reducer;
