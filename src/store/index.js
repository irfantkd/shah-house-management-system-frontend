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

const rootReducer = combineReducers({
  auth:                    authReducer,
  properties:              propertiesReducer,
  [apiSlice.reducerPath]:  apiSlice.reducer,
});

// Persist only currentId from properties — not the items array (those come from API on boot)
const propertiesTransform = createTransform(
  (inbound)  => ({ currentId: inbound.currentId }),
  (outbound) => ({ items: [], currentId: outbound.currentId ?? null, status: 'idle' }),
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
