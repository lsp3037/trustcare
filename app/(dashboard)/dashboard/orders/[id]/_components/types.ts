export interface ChecklistItem {
  checked: boolean;
  observation: string;
}

export interface OrderChecklist {
  password_pin: {
    has_password: boolean;
    password_value: string;
  };
  general_notes: string;
  [key: string]: ChecklistItem | any;
}

export interface ChecklistTemplateItem {
  id: string;
  label: string;
  type?: 'boolean';
  required?: boolean;
}
