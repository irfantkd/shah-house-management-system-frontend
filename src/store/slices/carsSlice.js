import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// ── Fetch ──────────────────────────────────────────────────────────────────
export const fetchCars = createAsyncThunk('cars/fetchAll', async (params) => {
  const { data } = await api.get('/cars', { params });
  return data.data;
});

// ── CRUD ───────────────────────────────────────────────────────────────────
export const addCar = createAsyncThunk('cars/add', async (payload, { getState }) => {
  const pid = getState().properties?.currentId;
  const { data } = await api.post('/cars', { ...payload, propertyId: pid });
  return data.data;
});

export const updateCar = createAsyncThunk('cars/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/cars/${id}`, payload);
  return data.data;
});

export const deleteCar = createAsyncThunk('cars/delete', async (id) => {
  await api.delete(`/cars/${id}`);
  return id;
});

// ── Expenses ───────────────────────────────────────────────────────────────
export const addCarExpense = createAsyncThunk('cars/addExpense', async ({ carId, ...expense }) => {
  const { data } = await api.post(`/cars/${carId}/expenses`, expense);
  return { carId, car: data.data };
});

export const deleteCarExpense = createAsyncThunk('cars/deleteExpense', async ({ carId, expenseId }) => {
  const { data } = await api.delete(`/cars/${carId}/expenses/${expenseId}`);
  return { carId, car: data.data };
});

// ── Fuel logs ──────────────────────────────────────────────────────────────
export const addFuelLog = createAsyncThunk('cars/addFuelLog', async ({ carId, ...log }) => {
  const { data } = await api.post(`/cars/${carId}/fuel-logs`, log);
  return { carId, car: data.data };
});

export const deleteFuelLog = createAsyncThunk('cars/deleteFuelLog', async ({ carId, logId }) => {
  const { data } = await api.delete(`/cars/${carId}/fuel-logs/${logId}`);
  return { carId, car: data.data };
});

// ── Maintenance ────────────────────────────────────────────────────────────
export const addCarMaintenance = createAsyncThunk('cars/addMaintenance', async ({ carId, ...record }) => {
  const { data } = await api.post(`/cars/${carId}/maintenance`, record);
  return { carId, car: data.data };
});

export const deleteCarMaintenance = createAsyncThunk('cars/deleteMaintenance', async ({ carId, recId }) => {
  const { data } = await api.delete(`/cars/${carId}/maintenance/${recId}`);
  return { carId, car: data.data };
});

// ── Helper: flatten embedded sub-resources ────────────────────────────────
function flattenCars(cars) {
  const expenses = cars.flatMap((c) =>
    (c.expenses ?? []).map((e) => ({ ...e, carId: c.id }))
  );
  const fuelLogs = cars.flatMap((c) =>
    (c.fuelLogs ?? []).map((f) => ({ ...f, carId: c.id }))
  );
  const cleanCars = cars.map((c) => ({ ...c }));
  return { cleanCars, expenses, fuelLogs };
}

function syncCarFromResponse(state, carId, updatedCar) {
  const idx = state.cars.findIndex((c) => c.id === carId);
  if (idx !== -1) state.cars[idx] = updatedCar;
  state.expenses = state.cars.flatMap((c) => (c.expenses ?? []).map((e) => ({ ...e, carId: c.id })));
  state.fuelLogs = state.cars.flatMap((c) => (c.fuelLogs ?? []).map((f) => ({ ...f, carId: c.id })));
}

// ── Slice ──────────────────────────────────────────────────────────────────
const carsSlice = createSlice({
  name: 'cars',
  initialState: { cars: [], expenses: [], fuelLogs: [], status: 'idle' },
  reducers: {
    addCarImage: (state, { payload: { carId, imageUrl } }) => {
      const car = state.cars.find((c) => c.id === carId);
      if (car) { if (!car.images) car.images = []; car.images.unshift(imageUrl); }
    },
    removeCarImage: (state, { payload: { carId, index } }) => {
      const car = state.cars.find((c) => c.id === carId);
      if (car?.images) car.images.splice(index, 1);
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchCars.fulfilled, (state, { payload }) => {
      const { cleanCars, expenses, fuelLogs } = flattenCars(payload);
      state.cars     = cleanCars;
      state.expenses = expenses;
      state.fuelLogs = fuelLogs;
    })
    .addCase(addCar.fulfilled,    (state, { payload }) => { state.cars.push(payload); })
    .addCase(updateCar.fulfilled, (state, { payload }) => {
      const i = state.cars.findIndex((c) => c.id === payload.id);
      if (i !== -1) state.cars[i] = payload;
    })
    .addCase(deleteCar.fulfilled, (state, { payload: id }) => {
      state.cars     = state.cars.filter((c) => c.id !== id);
      state.expenses = state.expenses.filter((e) => e.carId !== id);
      state.fuelLogs = state.fuelLogs.filter((f) => f.carId !== id);
    })
    .addCase(addCarExpense.fulfilled,    (state, { payload: { carId, car } }) => { syncCarFromResponse(state, carId, car); })
    .addCase(deleteCarExpense.fulfilled, (state, { payload: { carId, car } }) => { syncCarFromResponse(state, carId, car); })
    .addCase(addFuelLog.fulfilled,       (state, { payload: { carId, car } }) => { syncCarFromResponse(state, carId, car); })
    .addCase(deleteFuelLog.fulfilled,    (state, { payload: { carId, car } }) => { syncCarFromResponse(state, carId, car); })
    .addCase(addCarMaintenance.fulfilled,    (state, { payload: { carId, car } }) => {
      const i = state.cars.findIndex((c) => c.id === carId);
      if (i !== -1) state.cars[i] = car;
    })
    .addCase(deleteCarMaintenance.fulfilled, (state, { payload: { carId, car } }) => {
      const i = state.cars.findIndex((c) => c.id === carId);
      if (i !== -1) state.cars[i] = car;
    });
  },
});

export const { addCarImage, removeCarImage } = carsSlice.actions;

const pid = (s) => s.properties?.currentId;
export const selectCars            = (s) => (s.cars.cars ?? []).filter((c) => c.propertyId === pid(s));
export const selectCarExpenses     = (s) => s.cars.expenses ?? [];
export const selectFuelLogs        = (s) => s.cars.fuelLogs ?? [];
export const selectCarById         = (id) => (s) => (s.cars.cars ?? []).find((c) => c.id === id);
export const selectExpensesByCarId = (id) => (s) => (s.cars.expenses ?? []).filter((e) => e.carId === id);
export const selectFuelLogsByCarId     = (id) => (s) => (s.cars.fuelLogs ?? []).filter((f) => f.carId === id);
export const selectMaintenanceByCarId  = (id) => (s) => (s.cars.cars ?? []).find((c) => c.id === id)?.maintenance ?? [];

export default carsSlice.reducer;
