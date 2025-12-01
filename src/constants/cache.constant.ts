export enum CacheKey {
  OTP_VERIFICATION = 'auth:otp:%s', // %s: phone number
  SESSION_ORDER = 'orders:session:%s', // %s: sessionId
  SESSION_BLACKLIST = 'auth:session-blacklist:%s', // %s: sessionId
  EMAIL_VERIFICATION = 'auth:token:%s:email-verification', // %s: userId
  PASSWORD_RESET = 'auth:token:%s:password', // %s: userId
  // Order code counter theo tháng
  ORDER_CODE_COUNTER = 'orders:code:%s-%s', // %s: year, %s: month
  OTP_RATE_LIMIT = 'auth:otp-limit:%s', // %s: phone number
}
