import { type ClassValue, clsx } from "clsx";

/**
 * Utility for composing Tailwind class names conditionally.
 * Usage: cn("base-class", condition && "conditional-class", { "object-class": bool })
 */
export function cn(...inputs: ClassValue[]) {
	return clsx(inputs);
}
