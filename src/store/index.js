import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';

const storage = {
  getItem:    (key) => Promise.resolve(localStorage.getItem(key)),
  setItem:    (key, value) => Promise.resolve(localStorage.setItem(key, value)),
  removeItem: (key) => Promise.resolve(localStorage.removeItem(key)),
};

import authReducer          from './slices/authSlice';
import uiReducer           from './slices/uiSlice';
import companiesReducer    from './slices/companiesSlice';
import contractsReducer    from './slices/contractsSlice';
import maintenanceReducer  from './slices/maintenanceSlice';
import repairsReducer      from './slices/repairsSlice';
import assetsReducer       from './slices/assetsSlice';
import areasReducer        from './slices/areasSlice';
import documentsReducer    from './slices/documentsSlice';
import notificationsReducer from './slices/notificationsSlice';
import emergencyReducer    from './slices/emergencySlice';
import expensesReducer     from './slices/expensesSlice';
import settingsReducer     from './slices/settingsSlice';
import carsReducer         from './slices/carsSlice';

const rootReducer = combineReducers({
  auth:          authReducer,
  ui:            uiReducer,
  companies:     companiesReducer,
  contracts:     contractsReducer,
  maintenance:   maintenanceReducer,
  repairs:       repairsReducer,
  assets:        assetsReducer,
  areas:         areasReducer,
  documents:     documentsReducer,
  notifications: notificationsReducer,
  emergency:     emergencyReducer,
  expenses:      expensesReducer,
  settings:      settingsReducer,
  cars:          carsReducer,
});

const persistConfig = {
  key: 'ahms-v2',
  storage,
  blacklist: ['ui'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
