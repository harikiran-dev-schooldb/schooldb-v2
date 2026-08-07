

export type AttendanceSessionItem =
  {
    id: string;

    attendanceDate: string;

    teacher: {
      fullName: string;
    };

    subject: {
      name: string;
    };

    class: {
      name: string;
    };

    section: {
      name: string;
    };

    period: {
      name: string;
    };
  };

  export type AttendanceListItem = {
  id: string;

  status: string;

  student: {
    admissionNo: string;
    fullName: string;
  };

  session: {
    attendanceDate: string;

    class: {
      name: string;
    };

    section: {
      name: string;
    };

    subject: {
      name: string;
    };

    period: {
      name: string;
    };
  };
};