import { createSlice } from '@reduxjs/toolkit';

export const LOW_BALANCE_THRESHOLD = 500;

const DEFAULT_PID = 'prop-default';

const today = () => new Date().toISOString().split('T')[0];

const emptyWallet = () => ({ balance: 0, totalDeposited: 0, transactions: [] });

const ensureProperty = (state, pid) => {
  if (!state.byProperty[pid]) {
    state.byProperty[pid] = { vehicle: emptyWallet(), home: emptyWallet() };
  }
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState: {
    byProperty: {
      [DEFAULT_PID]: {
        vehicle: {
          balance: 5000,
          totalDeposited: 5000,
          transactions: [
            { id: 'wt-v-0', type: 'deposit', amount: 5000, note: 'Vehicle expense budget — July 2026', date: '2026-07-01', balanceAfter: 5000 },
          ],
        },
        home: {
          balance: 8000,
          totalDeposited: 8000,
          transactions: [
            { id: 'wt-h-0', type: 'deposit', amount: 8000, note: 'Home & household budget — July 2026', date: '2026-07-01', balanceAfter: 8000 },
          ],
        },
      },
    },
  },
  reducers: {
    depositToWallet: (state, { payload: { wallet, amount, note, date, propertyId } }) => {
      const pid = propertyId ?? DEFAULT_PID;
      ensureProperty(state, pid);
      const w = state.byProperty[pid][wallet];
      w.balance        += amount;
      w.totalDeposited += amount;
      w.transactions.unshift({
        id: `wt-${Date.now()}`,
        type: 'deposit',
        amount,
        note: note || '',
        date: date || today(),
        balanceAfter: w.balance,
      });
    },
    deductFromWallet: (state, { payload: { wallet, amount, description, date, category, propertyId } }) => {
      const pid = propertyId ?? DEFAULT_PID;
      ensureProperty(state, pid);
      const w = state.byProperty[pid][wallet];
      w.balance = Math.max(0, w.balance - amount);
      w.transactions.unshift({
        id: `wt-${Date.now()}-d`,
        type: 'expense',
        amount,
        description,
        category: category || '',
        date: date || today(),
        balanceAfter: w.balance,
      });
    },
  },
});

export const { depositToWallet, deductFromWallet } = walletSlice.actions;

const currentPid = (s) => s.properties?.currentId ?? DEFAULT_PID;

export const selectVehicleWallet = (s) => s.wallet.byProperty?.[currentPid(s)]?.vehicle ?? emptyWallet();
export const selectHomeWallet    = (s) => s.wallet.byProperty?.[currentPid(s)]?.home    ?? emptyWallet();
export const selectAllWallets    = (s) => s.wallet.byProperty?.[currentPid(s)] ?? { vehicle: emptyWallet(), home: emptyWallet() };

export default walletSlice.reducer;
