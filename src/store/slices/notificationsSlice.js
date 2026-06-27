import { createSlice, nanoid } from '@reduxjs/toolkit';
import { notifications as initial } from '../../data/mockNotifications';

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: initial },
  reducers: {
    markRead: (state, { payload }) => {
      const n = state.items.find((n) => n.id === payload);
      if (n) n.read = true;
    },
    markAllRead: (state) => {
      state.items.forEach((n) => { n.read = true; });
    },
    dismissNotification: (state, { payload }) => {
      state.items = state.items.filter((n) => n.id !== payload);
    },
    addNotification: (state, { payload }) => {
      state.items.unshift({
        id: `n-${nanoid(6)}`,
        date: new Date().toISOString().split('T')[0],
        read: false,
        priority: 'medium',
        type: 'general',
        ...payload,
      });
    },
  },
});

export const { markRead, markAllRead, dismissNotification, addNotification } = notificationsSlice.actions;
export const selectNotifications = (s) => s.notifications.items;
export const selectUnreadCount   = (s) => s.notifications.items.filter((n) => !n.read).length;
export default notificationsSlice.reducer;
