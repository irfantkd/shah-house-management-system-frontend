import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const DEFAULTS = {
  name: 'Shah House',
  type: 'Villa',
  status: 'Primary Residence',
  yearBuilt: null,
  renovated: null,
  size: null,
  landSize: null,
  bedrooms: 0,
  bathrooms: 0,
  floors: 0,
  parking: 0,
  pool: false,
  garden: false,
  smart: false,
  generator: false,
  solar: false,
  address: { villa: '', street: '', district: '', city: 'Dubai', emirate: 'Dubai', country: 'UAE', poBox: '', makani: '' },
  owner: { name: '', surname: '', title: '', phone: '', phoneAlt: '', email: '', whatsapp: '', nationality: '' },
  insurance: { provider: '', policyNumber: '', type: '', coverage: 0, premium: 0, startDate: '', expiryDate: '', contactPhone: '', contactEmail: '' },
  documents: [],
  images: [],
};

function mapBackendToFrontend(info, property) {
  return {
    ...DEFAULTS,
    ...info,
    name:      property?.name || info.name || DEFAULTS.name,
    type:      property?.type || info.type || DEFAULTS.type,
    status:    'Primary Residence',
    yearBuilt: info.builtYear  ?? info.yearBuilt  ?? null,
    size:      info.totalArea  ?? info.size        ?? null,
    bedrooms:  info.bedrooms   ?? 0,
    bathrooms: info.bathrooms  ?? 0,
    floors:    info.floors     ?? 0,
    parking:   info.parkingSpots ?? info.parking  ?? 0,
    address: {
      ...DEFAULTS.address,
      ...(info.address ?? {}),
      district: info.address?.area || info.address?.district || '',
      city:     info.address?.city || 'Dubai',
    },
    owner: {
      ...DEFAULTS.owner,
      ...(info.owner ?? {}),
    },
    insurance: {
      ...DEFAULTS.insurance,
      ...(info.insurance ?? {}),
      expiryDate: info.insurance?.expiry || info.insurance?.expiryDate || '',
      policyNumber: info.insurance?.policyNo || info.insurance?.policyNumber || '',
    },
    documents: info.documents ?? [],
    images:    info.images    ?? [],
  };
}

export const fetchHomeInfo = createAsyncThunk('homeInfo/fetch', async (propertyId, { getState }) => {
  const { data } = await api.get('/home-info', { params: { propertyId } });
  const property = getState().properties.items.find((p) => p.id === propertyId);
  return mapBackendToFrontend(data.data, property);
});

export const updateOverview = createAsyncThunk('homeInfo/updateOverview', async (payload, { getState }) => {
  const pid = getState().properties?.currentId;
  const { data } = await api.put('/home-info', payload, { params: { propertyId: pid } });
  const property = getState().properties.items.find((p) => p.id === pid);
  return mapBackendToFrontend(data.data, property);
});

export const updateOwner = createAsyncThunk('homeInfo/updateOwner', async (ownerPayload, { getState }) => {
  const pid = getState().properties?.currentId;
  const current = getState().homeInfo;
  const { data } = await api.put('/home-info', { owner: { ...current.owner, ...ownerPayload } }, { params: { propertyId: pid } });
  const property = getState().properties.items.find((p) => p.id === pid);
  return mapBackendToFrontend(data.data, property);
});

export const updateAddress = createAsyncThunk('homeInfo/updateAddress', async (addrPayload, { getState }) => {
  const pid = getState().properties?.currentId;
  const current = getState().homeInfo;
  const { data } = await api.put('/home-info', { address: { ...current.address, ...addrPayload } }, { params: { propertyId: pid } });
  const property = getState().properties.items.find((p) => p.id === pid);
  return mapBackendToFrontend(data.data, property);
});

export const updateInsurance = createAsyncThunk('homeInfo/updateInsurance', async (insPayload, { getState }) => {
  const pid = getState().properties?.currentId;
  const current = getState().homeInfo;
  const { data } = await api.put('/home-info', { insurance: { ...current.insurance, ...insPayload } }, { params: { propertyId: pid } });
  const property = getState().properties.items.find((p) => p.id === pid);
  return mapBackendToFrontend(data.data, property);
});

const homeInfoSlice = createSlice({
  name: 'homeInfo',
  initialState: DEFAULTS,
  reducers: {},
  extraReducers: (b) => {
    const set = (state, { payload }) => ({ ...state, ...payload });
    b.addCase(fetchHomeInfo.fulfilled,    set)
     .addCase(updateOverview.fulfilled,   set)
     .addCase(updateOwner.fulfilled,      set)
     .addCase(updateAddress.fulfilled,    set)
     .addCase(updateInsurance.fulfilled,  set);
  },
});

export const selectHomeInfo = (s) => s.homeInfo ?? DEFAULTS;
export default homeInfoSlice.reducer;
