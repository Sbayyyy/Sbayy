import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Styled HTML select wrapper.
 *
 * Accepts React.SelectHTMLAttributes<HTMLSelectElement>, including className,
 * and forwards the ref param to the underlying HTMLSelectElement. Always applies
 * the input base class and merges custom className values with cn. The
 * displayName is set to "Select" for debugging.
 */
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'input appearance-none bg-white bg-[linear-gradient(45deg,transparent_50%,#64748b_50%),linear-gradient(135deg,#64748b_50%,transparent_50%)] bg-[length:5px_5px,5px_5px] bg-[position:calc(100%-18px)_50%,calc(100%-13px)_50%] bg-no-repeat pr-10 font-medium text-slate-800 shadow-sm transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
        className
      )}
      {...props}
    />
  )
);

Select.displayName = 'Select';

export { Select };
