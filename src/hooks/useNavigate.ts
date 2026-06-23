import { createContext, useContext } from "react";

// Lightweight in-app navigation: App.tsx provides setCurrentSection here so any
// component (e.g. the Overview cards) can deep-link into a settings section
// without widening the zero-prop SECTIONS_CONFIG component contract.
export const NavigationContext = createContext<(section: string) => void>(() => {});

export const useNavigate = () => useContext(NavigationContext);
