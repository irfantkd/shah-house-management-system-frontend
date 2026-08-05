import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = import.meta.env.VITE_API_URL;

function settingsFetch(path, token) {
  return fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Loads the full settings document from /api/settings on login / app boot
export const loadSettings = createAsyncThunk(
  'settings/load',
  async (_, { getState }) => {
    try {
      const token = getState().auth?.token;
      if (!token) return null;
      const res = await settingsFetch('/settings', token);
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data ?? null;
    } catch {
      return null;
    }
  },
);

// Called by Settings page after a successful property save
export const patchPropertySettings = (propertyData) => (dispatch) => {
  dispatch(settingsSlice.actions.mergeProperty(propertyData));
};

// Called by Settings page after a successful notifications save
export const patchNotifSettings = (notifData) => (dispatch) => {
  dispatch(settingsSlice.actions.mergeNotifications(notifData));
};

const DEFAULT_PROPERTY = {
  propertyName: 'Shah House',
  emirate: 'Dubai',
  community: 'Palm Jumeirah',
  plotNumber: '',
  builtArea: 0,
  plotArea: 0,
  yearBuilt: 2021,
  currency: 'AED',
  language: 'English',
  dewaAccount: '',
  notes: '',
};

const DEFAULT_NOTIFS = {
  maintenance: true,
  repairs: true,
  warranties: true,
  contracts: true,
  expenses: false,
  carAlerts: true,
  salaryAlerts: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    data: null,   // full settings document from API (null until first load)
    status: 'idle', // 'idle' | 'loading' | 'loaded' | 'error'
  },
  reducers: {
    clearSettings: (state) => {
      state.data   = null;
      state.status = 'idle';
    },
    mergeProperty: (state, { payload }) => {
      if (!state.data) state.data = {};
      state.data.property = { ...(state.data.property ?? DEFAULT_PROPERTY), ...payload };
    },
    mergeNotifications: (state, { payload }) => {
      if (!state.data) state.data = {};
      state.data.notifications = { ...(state.data.notifications ?? DEFAULT_NOTIFS), ...payload };
    },
  },
  extraReducers: (b) => {
    b.addCase(loadSettings.pending,   (state)          => { state.status = 'loading'; })
     .addCase(loadSettings.fulfilled, (state, { payload }) => {
       if (payload) state.data = payload;
       state.status = 'loaded';
     })
     .addCase(loadSettings.rejected,  (state)          => { state.status = 'error'; });
  },
});

export const { clearSettings, mergeProperty, mergeNotifications } = settingsSlice.actions;

// Selectors
export const selectSettings     = (s) => s.settings.data;
export const selectCurrency     = (s) => s.settings.data?.property?.currency     ?? 'AED';
export const selectLanguage     = (s) => s.settings.data?.property?.language     ?? 'English';
export const selectNotifPrefs   = (s) => s.settings.data?.notifications          ?? DEFAULT_NOTIFS;
export const selectPropertySett = (s) => s.settings.data?.property               ?? DEFAULT_PROPERTY;

export default settingsSlice.reducer;
