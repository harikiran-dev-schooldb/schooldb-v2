const PLAY_REVIEW_PHONE = "9999999999";
const PLAY_REVIEW_OTP = "123456";

/**
 * Fixed Google Play review OTP.
 *
 * This review phone can use the fixed OTP across all SchoolDB tenants.
 * Normal users continue through the regular generated WhatsApp OTP flow.
 */
export function playReviewOtpFor(_schoolSlug: string, phone: string) {
  return phone === PLAY_REVIEW_PHONE ? PLAY_REVIEW_OTP : null;
}
