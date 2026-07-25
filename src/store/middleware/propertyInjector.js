// propertyId is now injected explicitly inside each async thunk via getState()
// This middleware is kept as a pass-through for backward compatibility
export const propertyInjector = () => (next) => (action) => next(action);
