import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const DEFAULTS = {
  profile: { firstName: '', lastName: '', email: '', phone: '', nationality: '', bio: '' },
  property: { name: '', type: '', bedrooms: '', bathrooms: '', floors: '', builtYear: '', area: '', address: '' },
  notifications: {
    emailContract: true, emailMaintenance: true, emailRepair: true, emailWarranty: true,
    smsContract: false, smsMaintenance: false, smsRepair: true, smsWarranty: false,
    pushAll: true, weeklyDigest: true,
  },
};

export const fetchSettings = createAsyncThunk('settings/fetch', async () => {
  const { data } = await api.get('/settings');
  return data.data;
});

export const saveProfile = createAsyncThunk('settings/saveProfile', async (payload, { getState }) => {
  const cur = getState().settings;
  const { data } = await api.put('/settings', { ...cur, profile: { ...cur.profile, ...payload } });
  return data.data;
});

export const saveProperty = createAsyncThunk('settings/saveProperty', async (payload, { getState }) => {
  const cur = getState().settings;
  const { data } = await api.put('/settings', { ...cur, property: { ...cur.property, ...payload } });
  return data.data;
});

export const saveNotifSettings = createAsyncThunk('settings/saveNotif', async (payload, { getState }) => {
  const cur = getState().settings;
  const { data } = await api.put('/settings', { ...cur, notifications: { ...cur.notifications, ...payload } });
  return data.data;
});

const settingsSlice = createSlice({
  name: 'settings',
  initialState: DEFAULTS,
  reducers: {},
  extraReducers: (b) => {
    const set = (_, { payload }) => ({
      ...DEFAULTS,
      profile:       payload.profile       ?? DEFAULTS.profile,
      property:      payload.property      ?? DEFAULTS.property,
      notifications: payload.notifications ?? DEFAULTS.notifications,
    });
    b.addCase(fetchSettings.fulfilled,    set)
     .addCase(saveProfile.fulfilled,      set)
     .addCase(saveProperty.fulfilled,     set)
     .addCase(saveNotifSettings.fulfilled, set);
  },
});

export const selectProfile       = (s) => s.settings.profile       ?? DEFAULTS.profile;
export const selectProperty      = (s) => s.settings.property      ?? DEFAULTS.property;
export const selectNotifSettings = (s) => s.settings.notifications ?? DEFAULTS.notifications;
export default settingsSlice.reducer;
