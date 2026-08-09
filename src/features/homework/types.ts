export type HomeworkListItem = {
  id: string;

  title: string;

  description?: string | null;

  assignedDate: string;

  dueDate?: string | null;

  active: boolean;

  class: {
    id: string;
    name: string;
  };

  section?: {
    id: string;
    name: string;
  } | null;
};