import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER, createTransform } from 'redux-persist';
import { apiSlice } from '../api/apiSlice';

const storage = {
  getItem:    (key) => Promise.resolve(localStorage.getItem(key)),
  setItem:    (key, value) => Promise.resolve(localStorage.setItem(key, value)),
  removeItem: (key) => Promise.resolve(localStorage.removeItem(key)),
};

import authReducer          from './slices/authSlice';
import uiReducer           from './slices/uiSlice';
import companiesReducer    from './slices/companiesSlice';
import contractsReducer    from './slices/contractsSlice';
import tasksReducer        from './slices/tasksSlice';
import assetsReducer       from './slices/assetsSlice';
import areasReducer        from './slices/areasSlice';
import notificationsReducer from './slices/notificationsSlice';
import expensesReducer     from './slices/expensesSlice';
import settingsReducer     from './slices/settingsSlice';
import carsReducer         from './slices/carsSlice';
import walletReducer       from './slices/walletSlice';
import employeesReducer   from './slices/employeesSlice';
import ownersReducer      from './slices/ownersSlice';
import propertiesReducer  from './slices/propertiesSlice';
import letterheadsReducer from './slices/letterheadsSlice';
import homeInfoReducer    from './slices/homeInfoSlice';
import usersReducer      from './slices/usersSlice';
import dashboardReducer from './slices/dashboardSlice';

const rootReducer = combineReducers({
  auth:          authReducer,
  ui:            uiReducer,
  companies:     companiesReducer,
  contracts:     contractsReducer,
  tasks:         tasksReducer,
  assets:        assetsReducer,
  areas:         areasReducer,
  notifications: notificationsReducer,
  expenses:      expensesReducer,
  settings:      settingsReducer,
  cars:          carsReducer,
  wallet:        walletReducer,
  employees:     employeesReducer,
  owners:        ownersReducer,
  properties:    propertiesReducer,
  letterheads:   letterheadsReducer,
  homeInfo:      homeInfoReducer,
  users:         usersReducer,
  dashboard:     dashboardReducer,
  [apiSlice.reducerPath]: apiSlice.reducer,
});

// Persist only currentId from properties — not the items array (those come from API on boot)
const propertiesTransform = createTransform(
  (inbound)  => ({ currentId: inbound.currentId }),
  (outbound) => ({ items: [], currentId: outbound.currentId ?? null, status: 'idle', error: null }),
  { whitelist: ['properties'] },
);

const persistConfig = {
  key: 'ahms-v5',
  storage,
  whitelist: ['auth', 'properties'],
  transforms: [propertiesTransform],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(apiSlice.middleware),
});

export const persistor = persistStore(store);
