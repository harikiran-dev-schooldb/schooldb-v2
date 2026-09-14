const PLAY_REVIEW_SCHOOL_SLUG = "testing";
const PLAY_REVIEW_PHONE = "9999999999";
const PLAY_REVIEW_OTP = "123456";

/**
 * Returns the fixed Google Play review code only for the dedicated review
 * tenant and mobile number. All other accounts must use a generated OTP.
 */
export function playReviewOtpFor(schoolSlug: string, phone: string) {
  return schoolSlug === PLAY_REVIEW_SCHOOL_SLUG && phone === PLAY_REVIEW_PHONE
    ? PLAY_REVIEW_OTP
    : null;
}
