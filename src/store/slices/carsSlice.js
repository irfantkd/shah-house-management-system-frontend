import { createSlice } from '@reduxjs/toolkit';
import { mockCars, mockCarExpenses, mockFuelLogs } from '../../data/mockCars';

const carsSlice = createSlice({
  name: 'cars',
  initialState: {
    cars:     mockCars,
    expenses: mockCarExpenses,
    fuelLogs: mockFuelLogs,
  },
  reducers: {
    addCar: (state, { payload }) => {
      state.cars.push({ ...payload, id: `car-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] });
    },
    updateCar: (state, { payload }) => {
      const i = state.cars.findIndex((c) => c.id === payload.id);
      if (i !== -1) state.cars[i] = { ...state.cars[i], ...payload };
    },
    deleteCar: (state, { payload }) => {
      state.cars     = state.cars.filter((c) => c.id !== payload);
      state.expenses = state.expenses.filter((e) => e.carId !== payload);
      state.fuelLogs = state.fuelLogs.filter((f) => f.carId !== payload);
    },
    addCarExpense: (state, { payload }) => {
      state.expenses.push({ ...payload, id: `ce-${Date.now()}` });
    },
    updateCarExpense: (state, { payload }) => {
      const i = state.expenses.findIndex((e) => e.id === payload.id);
      if (i !== -1) state.expenses[i] = { ...state.expenses[i], ...payload };
    },
    deleteCarExpense: (state, { payload }) => {
      state.expenses = state.expenses.filter((e) => e.id !== payload);
    },
    addFuelLog: (state, { payload }) => {
      state.fuelLogs.push({ ...payload, id: `fl-${Date.now()}` });
    },
    updateFuelLog: (state, { payload }) => {
      const i = state.fuelLogs.findIndex((f) => f.id === payload.id);
      if (i !== -1) state.fuelLogs[i] = { ...state.fuelLogs[i], ...payload };
    },
    deleteFuelLog: (state, { payload }) => {
      state.fuelLogs = state.fuelLogs.filter((f) => f.id !== payload);
    },
    addCarImage: (state, { payload: { carId, imageUrl } }) => {
      const car = state.cars.find((c) => c.id === carId);
      if (car) {
        if (!car.images) car.images = [];
        car.images.unshift(imageUrl);
      }
    },
    removeCarImage: (state, { payload: { carId, index } }) => {
      const car = state.cars.find((c) => c.id === carId);
      if (car?.images) car.images.splice(index, 1);
    },
  },
});

export const {
  addCar, updateCar, deleteCar,
  addCarExpense, updateCarExpense, deleteCarExpense,
  addFuelLog, updateFuelLog, deleteFuelLog,
  addCarImage, removeCarImage,
} = carsSlice.actions;

const pid = (s) => s.properties?.currentId ?? 'prop-default';

export const selectCars            = (s) => (s.cars.cars ?? []).filter((c) => (c.propertyId || 'prop-default') === pid(s));
export const selectCarExpenses     = (s) => s.cars.expenses ?? [];
export const selectFuelLogs        = (s) => s.cars.fuelLogs ?? [];
export const selectCarById         = (id) => (s) => (s.cars.cars ?? []).find((c) => c.id === id);
export const selectExpensesByCarId = (id) => (s) => (s.cars.expenses ?? []).filter((e) => e.carId === id);
export const selectFuelLogsByCarId = (id) => (s) => (s.cars.fuelLogs ?? []).filter((f) => f.carId === id);

export default carsSlice.reducer;
