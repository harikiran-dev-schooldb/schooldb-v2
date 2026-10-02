export const SCHOOL_TIME_ZONE = "Asia/Kolkata";

type DateValue = Date | string | number;

function date(value: DateValue) {
  return value instanceof Date ? value : new Date(value);
}

export function formatSchoolDateTime(value: DateValue) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: SCHOOL_TIME_ZONE,
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date(value));
}

export function formatSchoolDate(value: DateValue) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: SCHOOL_TIME_ZONE,
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(date(value));
}

export function formatSchoolDateTimeMedium(value: DateValue) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: SCHOOL_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date(value));
}

export function formatSchoolDateMedium(value: DateValue) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: SCHOOL_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date(value));
}

export function formatSchoolTime(value: DateValue) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: SCHOOL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date(value));
}
