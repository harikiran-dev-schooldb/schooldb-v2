export type SafeDatabaseError = {
  message: string;
  status: number;
};

function prismaErrorCode(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof error.code !== "string"
  ) {
    return null;
  }
  return /^P\d{4}$/.test(error.code) ? error.code : null;
}

export function safeDatabaseError(error: unknown): SafeDatabaseError | null {
  const code = prismaErrorCode(error);
  switch (code) {
    case "P2000":
      return { message: "One of the provided values is too long.", status: 400 };
    case "P2001":
    case "P2015":
    case "P2025":
      return {
        message: "The requested record was not found or was already removed.",
        status: 404,
      };
    case "P2002":
      return {
        message: "A record with the same unique details already exists. Review the fields and try again.",
        status: 409,
      };
    case "P2003":
      return {
        message: "A related record is missing or still in use. Refresh the page and try again.",
        status: 409,
      };
    case "P2004":
    case "P2014":
      return {
        message: "This change cannot be completed because the record is linked to other data.",
        status: 409,
      };
    case "P2005":
    case "P2006":
    case "P2007":
    case "P2011":
    case "P2012":
    case "P2013":
    case "P2019":
    case "P2020":
      return {
        message: "Some provided data is missing or invalid. Review the fields and try again.",
        status: 400,
      };
    case "P2024":
      return {
        message: "The database is busy right now. Please try again shortly.",
        status: 503,
      };
    case "P2034":
      return {
        message: "This record changed during the request. Refresh and try again.",
        status: 409,
      };
    default:
      return null;
  }
}

export function hasPrismaErrorCode(error: unknown) {
  return prismaErrorCode(error) !== null;
}
