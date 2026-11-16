import type { ReactNode } from 'react';

/** Red & gold ribbon with folded tails behind the main band. */
export function RibbonBanner({ children, className = '' }: { children: ReactNode; className?: string }) {
  const tail =
    'absolute top-3 h-full w-12 bg-[#6B0B12] border-4 border-ink [clip-path:polygon(0_0,100%_0,100%_100%,0_100%,35%_50%)]';
  return (
    <div className={`relative mx-auto w-fit px-10 ${className}`}>
      <div className={`${tail} -left-1 -z-0`} />
      <div className={`${tail} -right-1 -z-0 scale-x-[-1]`} />
      <div className="ribbon-band relative z-10 rounded-md px-6 py-1">
        <h1 className="text-outline text-center text-3xl leading-tight">{children}</h1>
      </div>
    </div>
  );
}
