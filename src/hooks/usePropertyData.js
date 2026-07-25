import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentPropertyId } from '../store/slices/propertiesSlice';

/**
 * Fetches property-scoped data on mount and whenever the active property changes.
 * thunk must accept { propertyId } as its first argument.
 */
export function usePropertyData(thunk) {
  const dispatch    = useDispatch();
  const propertyId  = useSelector(selectCurrentPropertyId);

  useEffect(() => {
    if (!propertyId) return;
    dispatch(thunk({ propertyId }));
  }, [propertyId, dispatch]);
}

/**
 * Same as usePropertyData but passes propertyId as a plain string.
 * Use for thunks like fetchWallet(propertyId) and fetchHomeInfo(propertyId).
 */
export function usePropertyDataId(thunk) {
  const dispatch    = useDispatch();
  const propertyId  = useSelector(selectCurrentPropertyId);

  useEffect(() => {
    if (!propertyId) return;
    dispatch(thunk(propertyId));
  }, [propertyId, dispatch]);
}
