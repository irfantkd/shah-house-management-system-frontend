import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { setPropertyWallet } from './walletSlice';

export const fetchEmployees = createAsyncThunk('employees/fetchAll', async (params) => {
  const { data } = await api.get('/employees', { params });
  return data.data;
});

export const addEmployee = createAsyncThunk('employees/add', async (payload, { getState }) => {
  const pid = getState().properties?.currentId;
  const { data } = await api.post('/employees', { status: 'active', ...payload, propertyId: pid });
  return data.data;
});

export const updateEmployee = createAsyncThunk('employees/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/employees/${id}`, payload);
  return data.data;
});

export const deleteEmployee = createAsyncThunk('employees/delete', async (id) => {
  await api.delete(`/employees/${id}`);
  return id;
});

export const recordSalaryPayment = createAsyncThunk(
  'employees/paySalary',
  async ({ employeeId, payment, propertyId }, { getState, dispatch }) => {
    const pid = propertyId || getState().properties?.currentId;
    const { data } = await api.post(`/employees/${employeeId}/pay-salary`, { ...payment, propertyId: pid });
    if (data.data.wallet) dispatch(setPropertyWallet({ propertyId: pid, wallet: data.data.wallet }));
    return data.data;
  },
);

export const recordAdvancePayment = createAsyncThunk(
  'employees/payAdvance',
  async ({ employeeId, payment, propertyId }, { getState, dispatch }) => {
    const pid = propertyId || getState().properties?.currentId;
    const { data } = await api.post(`/employees/${employeeId}/pay-advance`, { ...payment, propertyId: pid });
    if (data.data.wallet) dispatch(setPropertyWallet({ propertyId: pid, wallet: data.data.wallet }));
    return data.data;
  },
);

export const recoverAdvance = createAsyncThunk('employees/recoverAdvance', async ({ employeeId, paymentId }) => {
  const { data } = await api.put(`/employees/${employeeId}`, {
    'salaryHistory': { _markRecovered: paymentId },
  });
  return data.data;
});

const employeesSlice = createSlice({
  name: 'employees',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchEmployees.fulfilled,       (state, { payload }) => { state.items = payload; })
     .addCase(addEmployee.fulfilled,          (state, { payload }) => { state.items.push(payload); })
     .addCase(updateEmployee.fulfilled,       (state, { payload }) => {
       const i = state.items.findIndex((e) => e.id === payload.id);
       if (i !== -1) state.items[i] = payload;
     })
     .addCase(deleteEmployee.fulfilled,       (state, { payload: id }) => {
       state.items = state.items.filter((e) => e.id !== id);
     })
     .addCase(recordSalaryPayment.fulfilled,  (state, { payload }) => {
       const emp = payload.employee;
       const i = state.items.findIndex((e) => e.id === emp.id);
       if (i !== -1) state.items[i] = emp;
     })
     .addCase(recordAdvancePayment.fulfilled, (state, { payload }) => {
       const emp = payload.employee;
       const i = state.items.findIndex((e) => e.id === emp.id);
       if (i !== -1) state.items[i] = emp;
     })
     .addCase(recoverAdvance.fulfilled, (state, { payload }) => {
       const i = state.items.findIndex((e) => e.id === payload.id);
       if (i !== -1) state.items[i] = payload;
     });
  },
});

const pid = (s) => s.properties?.currentId;

export const selectOutstandingAdvance = (empId) => (s) =>
  ((s.employees.items ?? []).find((e) => e.id === empId)?.salaryHistory ?? [])
    .filter((p) => p.type === 'advance' && !p.recovered)
    .reduce((sum, p) => sum + p.amount, 0);

export const selectEmployees       = (s) => (s.employees.items ?? []).filter((e) => e.propertyId === pid(s));
export const selectActiveEmployees = (s) => (s.employees.items ?? []).filter((e) => e.status === 'active' && e.propertyId === pid(s));

export const selectUpcomingBirthdays = (s) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (s.employees.items ?? [])
    .filter((e) => e.status === 'active' && e.dateOfBirth && e.propertyId === pid(s))
    .map((e) => {
      const dob  = new Date(e.dateOfBirth);
      const yr   = today.getFullYear();
      let next   = new Date(yr, dob.getMonth(), dob.getDate());
      if (next < today) next = new Date(yr + 1, dob.getMonth(), dob.getDate());
      const days = Math.round((next - today) / 86_400_000);
      return { ...e, daysUntilBirthday: days, nextBirthday: next.toISOString().split('T')[0] };
    })
    .filter((e) => e.daysUntilBirthday <= 7)
    .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
};

export default employeesSlice.reducer;
