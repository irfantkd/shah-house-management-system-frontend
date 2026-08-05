import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER, createTransform } from 'redux-persist';
import { apiSlice } from '../api/apiSlice';

const storage = {
  getItem:    (key) => Promise.resolve(localStorage.getItem(key)),
  setItem:    (key, value) => Promise.resolve(localStorage.setItem(key, value)),
  removeItem: (key) => Promise.resolve(localStorage.removeItem(key)),
};

import authReducer       from './slices/authSlice';
import propertiesReducer from './slices/propertiesSlice';
import settingsReducer   from './slices/settingsSlice';

const rootReducer = combineReducers({
  auth:                    authReducer,
  properties:              propertiesReducer,
  settings:                settingsReducer,
  [apiSlice.reducerPath]:  apiSlice.reducer,
});

// Persist only currentId from properties — not the items array (those come from API on boot)
const propertiesTransform = createTransform(
  (inbound)  => ({ currentId: inbound.currentId }),
  (outbound) => ({ items: [], currentId: outbound.currentId ?? null, status: 'idle' }),
  { whitelist: ['properties'] },
);

// Persist only `data` from settings — status resets to 'idle' so AppLayout re-validates on boot
const settingsTransform = createTransform(
  (inbound)  => ({ data: inbound.data }),
  (outbound) => ({ data: outbound.data ?? null, status: 'idle' }),
  { whitelist: ['settings'] },
);

const persistConfig = {
  key: 'ahms-v5',
  storage,
  whitelist: ['auth', 'properties', 'settings'],
  transforms: [propertiesTransform, settingsTransform],
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
