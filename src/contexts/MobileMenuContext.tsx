import { createContext, useContext } from "react";

interface MobileMenuValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}

export const MobileMenuContext = createContext<MobileMenuValue>({ open: false, setOpen: () => {} });

export const useMobileMenu = () => useContext(MobileMenuContext);
