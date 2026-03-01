import { createContext, useContext } from 'react';

/**
 * EventContext
 * 
 * Provides event data to components that need it (e.g., Header for displaying event name)
 */
const noop = () => {};

const EventContext = createContext({
  event: null,
  eventId: null,
  isAdmin: false,
  refetch: noop
});

/**
 * useEventContext Hook
 * 
 * Hook to access event context
 * @returns {{event: object|null, eventId: string|null, isAdmin: boolean, refetch: function}}
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
 * @param {function} props.refetch - Trigger an immediate event data refresh
 * @param {React.ReactNode} props.children - Child components
 */
export function EventContextProvider({ event, eventId, isAdmin, refetch = noop, children }) {
  return (
    <EventContext.Provider value={{ event, eventId, isAdmin, refetch }}>
      {children}
    </EventContext.Provider>
  );
}

export default EventContext;
