import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const LOW_BALANCE_THRESHOLD = 500;

const emptyWallet = () => ({ balance: 0, totalDeposited: 0, transactions: [] });

export const fetchWallet = createAsyncThunk('wallet/fetch', async (propertyId) => {
  const { data } = await api.get('/wallet', { params: { propertyId } });
  return { propertyId, wallet: data.data };
});

export const depositToWallet = createAsyncThunk(
  'wallet/deposit',
  async ({ wallet, amount, note, date, propertyId }, { getState }) => {
    const pid = propertyId || getState().properties?.currentId;
    const { data } = await api.post('/wallet/deposit', {
      propertyId: pid,
      walletType: wallet,
      amount,
      description: note || 'Deposit',
      date,
    });
    return { propertyId: pid, wallet: data.data };
  },
);

export const deductFromWallet = createAsyncThunk(
  'wallet/deduct',
  async ({ wallet, amount, description, date, category, propertyId }, { getState }) => {
    const pid = propertyId || getState().properties?.currentId;
    const { data } = await api.post('/wallet/deduct', {
      propertyId: pid,
      walletType: wallet,
      amount,
      description,
      date,
      category,
    });
    return { propertyId: pid, wallet: data.data };
  },
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState: { byProperty: {} },
  reducers: {
    setPropertyWallet: (state, { payload: { propertyId, wallet } }) => {
      state.byProperty[propertyId] = {
        vehicle: wallet.vehicle ?? emptyWallet(),
        home:    wallet.home    ?? emptyWallet(),
        salary:  wallet.salary  ?? emptyWallet(),
      };
    },
  },
  extraReducers: (b) => {
    const setWallet = (state, { payload: { propertyId, wallet } }) => {
      state.byProperty[propertyId] = {
        vehicle: wallet.vehicle ?? emptyWallet(),
        home:    wallet.home    ?? emptyWallet(),
        salary:  wallet.salary  ?? emptyWallet(),
      };
    };
    b.addCase(fetchWallet.fulfilled,     setWallet)
     .addCase(depositToWallet.fulfilled, setWallet)
     .addCase(deductFromWallet.fulfilled, setWallet);
  },
});

const currentPid = (s) => s.properties?.currentId;
export const { setPropertyWallet } = walletSlice.actions;
export const selectVehicleWallet = (s) => s.wallet.byProperty?.[currentPid(s)]?.vehicle ?? emptyWallet();
export const selectHomeWallet    = (s) => s.wallet.byProperty?.[currentPid(s)]?.home    ?? emptyWallet();
export const selectSalaryWallet  = (s) => s.wallet.byProperty?.[currentPid(s)]?.salary  ?? emptyWallet();
export const selectAllWallets    = (s) => s.wallet.byProperty?.[currentPid(s)] ?? { vehicle: emptyWallet(), home: emptyWallet(), salary: emptyWallet() };

export default walletSlice.reducer;
