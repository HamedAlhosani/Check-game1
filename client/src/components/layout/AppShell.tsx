import { ReactNode } from 'react';
import { NavBar } from './NavBar';
import { PageBackground } from './PageBackground';

interface Props {
  children: ReactNode;
  showNav?: boolean;
}

export function AppShell({ children, showNav = true }: Props) {
  return (
    <div className="min-h-screen text-sand-light">
      <PageBackground />
      {showNav && <NavBar />}
      <main className="relative">{children}</main>
    </div>
  );
}
