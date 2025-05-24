export const IS_PUBLIC = 'isPublic';
export const IS_AUTH_OPTIONAL = 'isAuthOptional';
export const ROLE_KEY = 'role';

export enum Environment {
  LOCAL = 'local',
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

export enum LogService {
  CONSOLE = 'console',
  GOOGLE_LOGGING = 'google_logging',
  AWS_CLOUDWATCH = 'aws_cloudwatch',
}

export enum Order {
  ASC = 'asc',
  DESC = 'desc',
}

// Redact value of these paths from logs
export const loggingRedactPaths = [
  'req.headers.authorization',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.email',
  'req.body.password',
  'req.body.oldPassword',
];

export enum ImportHeaderKeys {
  STORE_PHONE = 'storePhone',
  PRODUCT_NAME = 'productName',
  MENU_NAME = 'menuName',
  CATEGORY_NAME = 'categoryName',
  BASE_PRICE = 'basePrice',
  DESCRIPTION = 'description',
  IMAGE = 'image',
  SIZES = 'sizes',
  SIZE_PRICES = 'sizePrices',
  TOPPINGS = 'toppings',
  TOPPING_PRICES = 'toppingPrices',
}

export const ImportHeaderLabels: Record<ImportHeaderKeys, string> = {
  [ImportHeaderKeys.STORE_PHONE]: 'Số điện thoại của cửa hàng',
  [ImportHeaderKeys.PRODUCT_NAME]: 'Tên sản phẩm',
  [ImportHeaderKeys.MENU_NAME]: 'Menu của sản phẩm',
  [ImportHeaderKeys.CATEGORY_NAME]: 'Danh mục sản phẩm',
  [ImportHeaderKeys.BASE_PRICE]: 'Giá',
  [ImportHeaderKeys.DESCRIPTION]: 'Mô tả',
  [ImportHeaderKeys.IMAGE]: 'Hình ảnh',
  [ImportHeaderKeys.SIZES]: 'Size (nhiều size cách nhau bởi dấu ,)',
  [ImportHeaderKeys.SIZE_PRICES]:
    'Giá của size (nhiều giá cách nhau bởi dấu ,)',
  [ImportHeaderKeys.TOPPINGS]: 'Topping (nhiều topping cách nhau bởi dấu ,)',
  [ImportHeaderKeys.TOPPING_PRICES]:
    'Giá của topping (nhiều topping cách nhau bởi dấu ,)',
};
export const DEFAULT_PAGE_LIMIT = 10;
export const DEFAULT_CURRENT_PAGE = 1;
export const SYSTEM_USER_ID = 'system';
