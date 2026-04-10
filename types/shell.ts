// Shell component interfaces
export interface NavbarProps {
  userEmail?: string;
  onMobileMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

export interface ShellProviderProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  userEmail?: string;
}

export interface AppFrameProps {
  src: string;
  title: string;
}

export interface UserMenuProps {
  userEmail: string;
}
