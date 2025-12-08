import { createContext, useContext } from 'react';

/**
 * EventContext
 * 
 * Provides event data to components that need it (e.g., Header for displaying event name)
 */
const EventContext = createContext({
  event: null,
  eventId: null,
  isAdmin: false
});

/**
 * useEventContext Hook
 * 
 * Hook to access event context
 * @returns {{event: object|null, eventId: string|null, isAdmin: boolean}}
 */
export function useEventContext() {
  return useContext(EventContext);
}

/**
 * EventContext Provider Component
 * 
 * @param {object} props
 * @param {object} props.event - Event data
 * @param {string} props.eventId - Event ID
 * @param {boolean} props.isAdmin - Whether current user is administrator
 * @param {React.ReactNode} props.children - Child components
 */
export function EventContextProvider({ event, eventId, isAdmin, children }) {
  return (
    <EventContext.Provider value={{ event, eventId, isAdmin }}>
      {children}
    </EventContext.Provider>
  );
}

export default EventContext;
