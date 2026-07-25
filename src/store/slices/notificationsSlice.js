import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchNotifications = createAsyncThunk('notifications/fetchAll', async (params) => {
  const { data } = await api.get('/notifications', { params });
  return data.data;
});

export const addNotification = createAsyncThunk('notifications/add', async (payload, { getState }) => {
  const propertyId = getState().properties?.currentId;
  const { data } = await api.post('/notifications', {
    propertyId,
    date: new Date().toISOString().split('T')[0],
    read: false,
    priority: 'medium',
    type: 'general',
    ...payload,
  });
  return data.data;
});

export const markRead = createAsyncThunk('notifications/markRead', async (id) => {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data.data;
});

export const markAllRead = createAsyncThunk('notifications/markAllRead', async (propertyId) => {
  await api.patch('/notifications/read-all', null, { params: propertyId ? { propertyId } : {} });
  return true;
});

export const dismissNotification = createAsyncThunk('notifications/dismiss', async (id) => {
  await api.delete(`/notifications/${id}`);
  return id;
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchNotifications.fulfilled, (state, { payload }) => { state.items = payload; })
     .addCase(addNotification.fulfilled,    (state, { payload }) => { state.items.unshift(payload); })
     .addCase(markRead.fulfilled,           (state, { payload }) => {
       const n = state.items.find((n) => n.id === payload.id);
       if (n) n.read = true;
     })
     .addCase(markAllRead.fulfilled, (state) => {
       state.items.forEach((n) => { n.read = true; });
     })
     .addCase(dismissNotification.fulfilled, (state, { payload: id }) => {
       state.items = state.items.filter((n) => n.id !== id);
     });
  },
});

export const selectNotifications = (s) => s.notifications.items ?? [];
export const selectUnreadCount   = (s) => (s.notifications.items ?? []).filter((n) => !n.read).length;
export default notificationsSlice.reducer;
