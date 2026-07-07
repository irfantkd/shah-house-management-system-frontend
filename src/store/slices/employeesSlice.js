import { createSlice } from '@reduxjs/toolkit';
import { mockEmployees } from '../../data/mockEmployees';

const employeesSlice = createSlice({
  name: 'employees',
  initialState: { items: mockEmployees },
  reducers: {
    addEmployee: (state, { payload }) => {
      state.items.push({ id: `emp-${Date.now()}`, status: 'active', salaryHistory: [], notes: '', ...payload });
    },
    updateEmployee: (state, { payload }) => {
      const i = state.items.findIndex((e) => e.id === payload.id);
      if (i !== -1) state.items[i] = { ...state.items[i], ...payload };
    },
    deleteEmployee: (state, { payload }) => {
      state.items = state.items.filter((e) => e.id !== payload);
    },
    recordSalaryPayment: (state, { payload: { employeeId, payment } }) => {
      const emp = state.items.find((e) => e.id === employeeId);
      if (emp) emp.salaryHistory.unshift({ id: `sh-${Date.now()}`, type: 'salary', ...payment });
    },
    recordAdvancePayment: (state, { payload: { employeeId, payment } }) => {
      const emp = state.items.find((e) => e.id === employeeId);
      if (emp) emp.salaryHistory.unshift({ id: `adv-${Date.now()}`, type: 'advance', recovered: false, ...payment });
    },
    recoverAdvance: (state, { payload: { employeeId, paymentId } }) => {
      const emp = state.items.find((e) => e.id === employeeId);
      if (emp) {
        const p = emp.salaryHistory.find((p) => p.id === paymentId);
        if (p) p.recovered = true;
      }
    },
  },
});

export const { addEmployee, updateEmployee, deleteEmployee, recordSalaryPayment, recordAdvancePayment, recoverAdvance } = employeesSlice.actions;

const pid = (s) => s.properties?.currentId ?? 'prop-default';

export const selectOutstandingAdvance = (empId) => (s) =>
  (s.employees.items.find((e) => e.id === empId)?.salaryHistory ?? [])
    .filter((p) => p.type === 'advance' && !p.recovered)
    .reduce((sum, p) => sum + p.amount, 0);

export const selectEmployees       = (s) => (s.employees.items ?? []).filter((e) => (e.propertyId || 'prop-default') === pid(s));
export const selectActiveEmployees = (s) => (s.employees.items ?? []).filter((e) => e.status === 'active' && (e.propertyId || 'prop-default') === pid(s));

export const selectUpcomingBirthdays = (s) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (s.employees.items ?? [])
    .filter((e) => e.status === 'active' && e.dateOfBirth && (e.propertyId || 'prop-default') === pid(s))
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
