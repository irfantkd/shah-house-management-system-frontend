import { createSlice } from '@reduxjs/toolkit';

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    profile: {
      firstName: 'Mirfan', lastName: 'Al Rashidi',
      email: 'mirfanldn@gmail.com', phone: '+971 50 234 5678',
      nationality: 'UAE', bio: 'Owner of Villa Al Marfa, Palm Jumeirah.',
    },
    property: {
      name: 'Villa Al Marfa', type: 'Luxury Villa',
      bedrooms: '5', bathrooms: '6', floors: '2', builtYear: '2021',
      area: '650 sqm', address: 'Palm Jumeirah, Zone 2, Dubai, UAE',
    },
    notifications: {
      emailContract: true, emailMaintenance: true, emailRepair: true, emailWarranty: true,
      smsContract: false, smsMaintenance: false, smsRepair: true, smsWarranty: false,
      pushAll: true, weeklyDigest: true,
    },
  },
  reducers: {
    saveProfile:  (state, { payload }) => { state.profile = { ...state.profile, ...payload }; },
    saveProperty: (state, { payload }) => { state.property = { ...state.property, ...payload }; },
    saveNotifSettings: (state, { payload }) => { state.notifications = { ...state.notifications, ...payload }; },
  },
});

export const { saveProfile, saveProperty, saveNotifSettings } = settingsSlice.actions;
export const selectProfile  = (s) => s.settings.profile;
export const selectProperty = (s) => s.settings.property;
export const selectNotifSettings = (s) => s.settings.notifications;
export default settingsSlice.reducer;
