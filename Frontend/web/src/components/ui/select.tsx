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
    <select ref={ref} className={cn('input', className)} {...props} />
  )
);

Select.displayName = 'Select';

export { Select };
