import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn's standard className helper — merges conditional + tailwind classes.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
