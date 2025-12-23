export type ActionResponse<T = unknown> =
  | { success: true; data?: T }
  | { success: false; message: string; fieldErrors?: Record<string, string[]> };
