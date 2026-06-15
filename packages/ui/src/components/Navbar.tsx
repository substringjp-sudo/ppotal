import React from 'react';
import { Plane, Train, Map, LayoutGrid, Sun } from 'lucide-react';

export const Navbar = () => {
  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl z-50 px-6 py-3 rounded-2xl glass-effect flex items-center justify-between shadow-2xl">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
          <Plane className="text-white w-5 h-5" />
        </div>
        <span className="font-heading text-xl font-bold tracking-tight">PPOTAL</span>
      </div>

      <div className="hidden md:flex items-center gap-8">
        <NavLink icon={<LayoutGrid size={18} />} label="Portal" href="/" active />
        <NavLink icon={<Train size={18} />} label="JP Rail" href="https://jprail.pplaner.com" />
        <NavLink icon={<Map size={18} />} label="Region" href="https://rgnevel.pplaner.com" />
        <NavLink icon={<Sun size={18} />} label="BeforeGlow" href="https://bglow.pplaner.com" />
        <NavLink icon={<Plane size={18} />} label="P-Plan" href="https://app.pplaner.com" />
      </div>

      <div className="flex items-center gap-4">
        <button className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium transition-all transform hover:scale-105">
          Get Started
        </button>
      </div>
    </nav>
  );
};

const NavLink = ({ icon, label, href, active = false }: { icon: any, label: string, href: string, active?: boolean }) => (
  <a 
    href={href}
    className={`flex items-center gap-2 text-sm font-medium transition-smooth hover:text-sky-400 ${active ? 'text-sky-400' : 'text-slate-400'}`}
  >
    {icon}
    {label}
  </a>
);
