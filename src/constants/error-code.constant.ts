export enum ErrorCode {
  // Common Validation

  CV000 = 'common.validation.is_empty',
  CV001 = 'common.out_time_working',
  CV002 = 'common.validation.is_invalid_lat_lng',

  // Auth
  A001 = 'auth.error.invalid_credentials',
  A002 = 'auth.error.not_found',
  A003 = 'auth.error.inactive',
  A004 = 'auth.error.expired',
  A005 = 'auth.error.invalid_token',
  A006 = 'auth.error.invalid_refresh_token',

  // Category
  C001 = 'category.error.not_found',

  //Zalo
  // Update zalo token failed
  Z001 = 'zalo.error.update_token_failed',
  Z002 = 'zalo.error.phone_invalid',
  Z003 = 'zalo.error.invalid_code',
  Z004 = 'zalo.error.otp_in_cooldown',
  Z005 = 'zalo.error.otp_invalid',
  Z006 = 'zalo.error.otp_send_failed',

  // Validation
  UV001 = 'user.validation.is_empty',
  UV002 = 'user.validation.is_invalid',

  // User
  U001 = 'user.error.not_found',
  U002 = 'user.error.already_exists',
  U003 = 'user.error.is_locked',
  // mật khẩu không đúng
  U004 = 'user.error.invalid_password',
  // phone đã được đăng ký
  U005 = 'user.error.phone_existed',

  // Deliver
  D001 = 'deliver.error.not_found',
  D002 = 'deliver.error.invalid_password',
  D003 = 'deliver.error.locked',
  D004 = 'deliver.error.cant_take-order',
  D005 = 'deliver.error.not_enough_point',
  D006 = 'deliver.error.cant_change_active_status',
  D007 = 'deliver.error.existed',
  // nhận tối đa 3 đơn
  D008 = 'deliver.error.reach_max_active_orders',

  //Product
  P001 = 'product.error.not_found',
  P002 = 'product.error.product_not_enough_sale_quantity',
  // Sản phẩm bị khóa
  P003 = 'product.error.is_locked',
  // Voucher
  V000 = 'voucher.unique.code',
  V001 = 'voucher.error.not_found',
  V002 = 'voucher.error.already_exists',
  V003 = 'voucher.error.not_active',
  V004 = 'voucher.error.expired',
  //voucher không thuộc store
  V005 = 'voucher.error.not_belong_to_store',
  //voucher không dùng được nữa
  V006 = 'voucher.error.not_useable',
  V007 = 'voucher.error.conflict_order_value',
  V008 = 'voucher.error.not_qualified',
  V009 = 'voucher.error.bad_input',

  // Store Request
  SR001 = 'store_request.error.not_found',
  SR002 = 'store_request.error.already_exists',
  SR003 = 'store_request.error.already_accepted_or_rejected',

  // Store
  S001 = 'store.error.not_found',
  S002 = 'store.error.already_exists',
  S003 = 'store.error.not_active',
  S004 = 'store.error.product_not_belong_to_store',
  S005 = 'store.error.is_locked',
  // cập nhật time working không hợp lệ
  S006 = 'store.error.invalid_time_working',
  //Invalid origins format. Expected format: "latitude,longitude"
  S007 = 'store.error.invalid_origins_format',
  // cửa hàng chưa thiết lập time working
  S008 = 'store.error.not_set_time_working',

  //Banner
  B001 = 'banner.error.not_found',
  B002 = 'banner.error.already_exists',

  //Store Menu
  SM001 = 'store_menu.error.not_found',
  SM002 = 'store_menu.error.not_belong_to_store',

  //Order Session
  OS001 = 'order_session.error.not_found',

  //Order
  OD001 = 'order.error.not_found',
  OD002 = 'order.error.wrong_line_status',
  OD003 = 'order.error.not_cancel_order',
  // không phải là status pending
  OD005 = 'order.error.not_status_pending',

  // Manager
  M001 = 'manager.error.not_found',
  M002 = 'manager.error.already_exists',
  //Option
  O001 = 'option.error.not_found',
  O002 = 'option.error.not_belong_to_product',
  //Extra

  E001 = 'extra.error.not_found',
  E002 = 'extra.error.not_belong_to_product',

  //Goong API
  G001 = 'goong.error.invalid_data',

  //Category Item
  CI001 = 'category_item.error.not_found',

  //Comment In Rating
  CR001 = 'comment_in_rating.error.not_found',
  CR002 = 'comment_in_rating.error.already_exists',

  //Comment
  CM001 = 'comment.error.not_found',
  // đơn hàng đã có đánh giá
  CM002 = 'comment.error.order_had_rated',
  CM003 = 'comment.error.wrong_id_input',

  //Rotation
  R001 = 'route.error.not_found',

  //Area
  AR001 = 'area.error.not_found',
  AR002 = 'area.error.already_exists',
  TR002 = 'area.not_enough_point',

  //Bank
  BK001 = 'bank.error.not_found',

  //Transaction Request
  TR001 = 'transaction_request.error.not_found',
  TR003 = 'transaction_request.error.not_status_pending',

  // Setting
  ST001 = 'setting.error.not_found',
  ST003 = 'setting.error.area_not_active',
  // ServiceFee
  SF001 = 'service_fee.error.not_found',
  // Notification
  N001 = 'notification.error.not_found',

  //Excel
  EX001 = 'excel.error',
}
