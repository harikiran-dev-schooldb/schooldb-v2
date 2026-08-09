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

export type HomeworkDetails = {
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

  academicYear?: {
    id: string;
    name: string;
  } | null;

  teacher?: {
    id: string;
    fullName: string;
  } | null;

  subject?: {
    id: string;
    name: string;
  } | null;
};