/**
 * UI-related types and interfaces
 */

export interface UIComponent {
  id: string;
  type: 'menu' | 'form' | 'display' | 'prompt';
  title: string;
}

export interface MenuOption<T = string> {
  value: T;
  label: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
}

export interface FormData {
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'confirm';
  placeholder?: string;
  options?: MenuOption[];
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
}

export interface DisplayConfig {
  title: string;
  subtitle?: string;
  showProgress?: boolean;
  showStats?: boolean;
  maxItems?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PromptConfig {
  message: string;
  type: 'select' | 'confirm' | 'text' | 'multiselect';
  options?: MenuOption[];
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  };
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  successColor: string;
  errorColor: string;
  warningColor: string;
  infoColor: string;
}

export interface ConsoleConfig {
  width: number;
  height: number;
  colors: boolean;
  unicode: boolean;
  animations: boolean;
}

// UI state management
export interface UIState {
  currentView: string;
  previousView?: string;
  data: Record<string, any>;
  errors: string[];
  loading: boolean;
}

export type UIEvent =
  | { type: 'NAVIGATE'; view: string; data?: any }
  | { type: 'SUBMIT_FORM'; formId: string; data: FormData }
  | { type: 'SELECT_OPTION'; fieldId: string; value: any }
  | { type: 'SHOW_ERROR'; message: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_LOADING'; loading: boolean };

// Progress bar types
export interface ProgressBarConfig {
  current: number;
  total: number;
  width?: number;
  showPercentage?: boolean;
  showLabel?: boolean;
  character?: '█' | '▓' | '▒' | '░';
}

export interface ConsoleMessage {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp?: Date;
}

export interface NotificationConfig {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number; // in milliseconds
  persistent?: boolean;
}
