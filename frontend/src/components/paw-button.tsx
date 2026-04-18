import { ReactNode } from 'react';
import clsx from 'clsx';

type Props = {
    children: ReactNode;
    className?: string;
};

export default function PawButton({ children, className }: Props) {
    return (
        <span
            className={clsx(
                'relative inline-flex items-center justify-center rounded-2xl bg-[#d98f5c] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#c97d49]',
                className,
            )}
        >
      <span className="pointer-events-none absolute -left-1 top-1 h-2.5 w-2.5 rounded-full bg-[#efc39b]" />
      <span className="pointer-events-none absolute left-2 -top-1 h-2 w-2 rounded-full bg-[#efc39b]" />
      <span className="pointer-events-none absolute right-2 -top-1 h-2 w-2 rounded-full bg-[#efc39b]" />
      <span className="pointer-events-none absolute -right-1 top-1 h-2.5 w-2.5 rounded-full bg-[#efc39b]" />
            {children}
    </span>
    );
}