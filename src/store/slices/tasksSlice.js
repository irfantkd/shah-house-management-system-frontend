import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const today = () => new Date().toISOString().split('T')[0];

export const fetchTasks = createAsyncThunk('tasks/fetchAll', async (params) => {
  const { data } = await api.get('/tasks', { params });
  return data.data;
});

export const addTask = createAsyncThunk('tasks/add', async (payload, { getState }) => {
  const pid = getState().properties?.currentId;
  const { data } = await api.post('/tasks', { status: 'scheduled', ...payload, propertyId: pid });
  return data.data;
});

export const updateTask = createAsyncThunk('tasks/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/tasks/${id}`, payload);
  return data.data;
});

export const deleteTask = createAsyncThunk('tasks/delete', async (id) => {
  await api.delete(`/tasks/${id}`);
  return id;
});

export const setTaskStatus = createAsyncThunk(
  'tasks/setStatus',
  async ({ id, status, completedDate, actualCost, completionNotes }) => {
    const body = { status };
    if (status === 'completed') {
      body.completedDate   = completedDate ?? today();
      if (actualCost !== undefined && actualCost !== null) body.actualCost = actualCost;
      if (completionNotes) body.completionNotes = completionNotes;
    }
    const { data } = await api.put(`/tasks/${id}`, body);
    return data.data;
  },
);

export const addTaskExpense = createAsyncThunk('tasks/addExpense', async ({ taskId, expense }) => {
  const { data } = await api.post(`/tasks/${taskId}/expenses`, expense);
  return data.data;
});

export const removeTaskExpense = createAsyncThunk('tasks/removeExpense', async ({ taskId, expenseId }) => {
  const { data } = await api.delete(`/tasks/${taskId}/expenses/${expenseId}`);
  return data.data;
});

export const autoMarkOverdue = createAsyncThunk('tasks/autoMarkOverdue', async (_, { getState, dispatch }) => {
  const todayStr = today();
  const tasks = getState().tasks?.items ?? [];
  const overdue = tasks.filter((t) => t.status === 'scheduled' && t.scheduledDate && t.scheduledDate < todayStr);
  await Promise.all(overdue.map((t) => dispatch(setTaskStatus({ id: t.id, status: 'overdue' }))));
  return overdue.map((t) => t.id);
});

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: { items: [], categories: ['Maintenance', 'Repair'], status: 'idle' },
  reducers: {
    addCategory: (state, { payload }) => {
      if (payload && !state.categories.includes(payload)) state.categories.push(payload);
    },
    deleteCategory: (state, { payload }) => {
      if (payload !== 'Maintenance' && payload !== 'Repair') {
        state.categories = state.categories.filter((c) => c !== payload);
      }
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchTasks.fulfilled,    (state, { payload }) => { state.items = payload; })
     .addCase(addTask.fulfilled,       (state, { payload }) => { state.items.push(payload); })
     .addCase(updateTask.fulfilled,    (state, { payload }) => {
       const i = state.items.findIndex((t) => t.id === payload.id);
       if (i !== -1) state.items[i] = payload;
     })
     .addCase(deleteTask.fulfilled,    (state, { payload: id }) => {
       state.items = state.items.filter((t) => t.id !== id);
     })
     .addCase(setTaskStatus.fulfilled, (state, { payload }) => {
       const i = state.items.findIndex((t) => t.id === payload.id);
       if (i !== -1) state.items[i] = payload;
     })
     .addCase(addTaskExpense.fulfilled,    (state, { payload }) => {
       const i = state.items.findIndex((t) => t.id === payload.id);
       if (i !== -1) state.items[i] = payload;
     })
     .addCase(removeTaskExpense.fulfilled, (state, { payload }) => {
       const i = state.items.findIndex((t) => t.id === payload.id);
       if (i !== -1) state.items[i] = payload;
     });
  },
});

export const { addCategory, deleteCategory } = tasksSlice.actions;

const pid = (s) => s.properties?.currentId;
export const selectTasks             = (s) => (s.tasks?.items ?? []).filter((t) => t.propertyId === pid(s));
export const selectCategories        = (s) => s.tasks?.categories ?? ['Maintenance', 'Repair'];
export const selectTasksByContractId = (contractId) => (s) => selectTasks(s).filter((t) => t.contractId === contractId);
export const selectTasksByCompanyId  = (companyId)  => (s) => selectTasks(s).filter((t) => t.companyId  === companyId);
export const selectAllTaskExpenses   = (s) => selectTasks(s).flatMap((t) =>
  (t.expenses ?? []).map((e) => ({
    ...e, taskId: t.id, taskTitle: t.title, taskCategory: t.category,
    areaName: t.areaName ?? '', companyName: t.companyName ?? '',
  }))
);

export default tasksSlice.reducer;
