// Re-export all types from a central index
export * from './shell';
export * from './auth';
export * from './apps';
export * from './notifications';
export * from './directory';

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;
