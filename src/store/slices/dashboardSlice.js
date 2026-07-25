import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchDashboard = createAsyncThunk(
  'dashboard/fetch',
  async (propertyId, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/dashboard', { params: { propertyId } });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to load dashboard');
    }
  },
);

const empty = {
  stats:             { activeContracts: 0, upcomingMaintenance: 0, openRepairs: 0, totalAssets: 0, totalAreas: 0, carAlerts: 0 },
  home:              { name: '', type: '', status: '', bedrooms: 0, bathrooms: 0, size: 0, yearBuilt: null, parking: 0, owner: {}, address: {}, insurance: {} },
  wallet:            { home: { balance: 0, totalDeposited: 0 }, vehicle: { balance: 0, totalDeposited: 0 } },
  upcomingSchedule:  [],
  recentActivities:  [],
  expiringContracts: [],
  expenses:          { month: '', property: 0, household: 0, vehicle: 0, fuel: 0 },
  areas:             [],
  cars:              [],
  fleetFuelMonth:    0,
  healthScore:       100,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: { data: empty, status: 'idle', error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchDashboard.pending,   (state) => { state.status = 'loading'; state.error = null; })
     .addCase(fetchDashboard.fulfilled, (state, { payload }) => { state.status = 'succeeded'; state.data = payload; })
     .addCase(fetchDashboard.rejected,  (state, { payload }) => { state.status = 'failed'; state.error = payload; });
  },
});

export const selectDashboard       = (s) => s.dashboard.data;
export const selectDashboardStatus = (s) => s.dashboard.status;
export default dashboardSlice.reducer;
