export type ActionResponse<T = unknown> =
  | { success: true; data?: T; remaining?: number; limit?: number }
  | { success: false; message: string; fieldErrors?: Record<string, string[]> };
