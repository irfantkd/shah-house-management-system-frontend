import { DEFAULT_PROPERTY_ID } from '../slices/propertiesSlice';

// Action types that automatically receive a propertyId from the currently active property
const INJECT_ACTIONS = new Set([
  'areas/addArea',
  'assets/addAsset',
  'employees/addEmployee',
  'owners/addOwner',
  'cars/addCar',
  'tasks/addTask',
  'contracts/addContract',
  'expenses/addExpense',
  'documents/addDocument',
  'emergency/addContact',
  'wallet/depositToWallet',
  'wallet/deductFromWallet',
]);

export const propertyInjector = (store) => (next) => (action) => {
  if (
    INJECT_ACTIONS.has(action.type) &&
    action.payload &&
    typeof action.payload === 'object' &&
    !action.payload.propertyId
  ) {
    const pid = store.getState().properties?.currentId ?? DEFAULT_PROPERTY_ID;
    return next({ ...action, payload: { ...action.payload, propertyId: pid } });
  }
  return next(action);
};
