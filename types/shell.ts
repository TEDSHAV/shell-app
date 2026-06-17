// Shell component interfaces
export interface NavbarProps {
  userEmail?: string;
  onMobileMenuToggle: () => void;
  isMobileMenuOpen: boolean;
  userRolesByApp?: Record<string, string>;
  globalRole?: string;
}

export interface ShellProviderProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  userEmail?: string;
  userRolesByApp?: Record<string, string>;
  globalRole?: string;
}

export interface AppFrameProps {
  appId: string;
  src: string;
  title: string;
}

export interface UserMenuProps {
  userEmail: string;
}
