import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence handling.
 *
 * Combines `clsx` (conditional class names) with `tailwind-merge`
 * (conflict resolution for Tailwind utilities).
 *
 * @example
 * cn('px-2 py-1', 'px-4')           // → 'py-1 px-4'
 * cn('text-red-500', isActive && 'text-blue-500')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
