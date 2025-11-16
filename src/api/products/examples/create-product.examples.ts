import { CreateProductReqDto } from '@/api/products/dto/create-product.req.dto';
import { UpdateProductReqDto } from '@/api/products/dto/update-product.req.dto';

// Helper functions để tạo các phần chung
const createBaseProduct = (overrides: Partial<CreateProductReqDto>): CreateProductReqDto => ({
  storeMenuId: 1,
  storeId: 10,
  categoryItemId: 3,
  name: 'Trà sữa Oolong',
  price: 45_000,
  quantity: 100,
  description: 'Trà sữa Oolong topping trân châu đen',
  ...overrides,
});

const createOptionGroup = (
  name: string,
  displayName: string,
  options: Array<{ name: string; price: number; id?: number }>,
  orderIndex: number = 0,
  id?: number,
) => ({
  ...(id && { id }),
  name,
  displayName,
  orderIndex,
  options: options.map((opt) => ({
    name: opt.name,
    price: opt.price,
    ...(opt.id && { id: opt.id }),
  })),
});

const createExtra = (name: string, price: number, id?: number) => ({
  ...(id && { id }),
  name,
  price,
});

// Common option groups
const sizeOptions = [
  { name: 'Ly nhỏ', price: 0 },
  { name: 'Ly lớn', price: 5_000 },
];

const sugarOptions = [
  { name: 'Ít đường', price: 0 },
  { name: 'Nhiều đường', price: 0 },
];

const vegetableOptions = [
  { name: 'Ít rau', price: 0 },
  { name: 'Nhiều rau', price: 0 },
];

const spiceOptions = [
  { name: 'Ít ớt', price: 0 },
  { name: 'Thêm ớt', price: 0 },
];

// Common extras
const commonExtras = [createExtra('Trân châu trắng', 7_000), createExtra('Thạch phô mai', 8_000)];

// Create examples
const saleProductExample: CreateProductReqDto = createBaseProduct({
  salePrice: 39_000,
  limitedFlashSaleQuantity: 50,
  startDate: new Date('2025-03-01T00:00:00Z'),
  endDate: new Date('2025-03-15T23:59:59Z'),
  optionGroups: [
    createOptionGroup('option_one', 'Option 1', sizeOptions, 0),
    createOptionGroup('option_two', 'Option 2', sugarOptions, 1),
  ],
  extras: commonExtras,
});

const nonSaleProductExample: CreateProductReqDto = createBaseProduct({
  storeMenuId: 2,
  storeId: 11,
  categoryItemId: 5,
  name: 'Bánh mì thịt nguội',
  price: 30_000,
  quantity: 50,
  description: 'Bánh mì thịt nguội kèm dưa leo, đồ chua',
  optionGroups: [
    createOptionGroup('option_one', 'Option 1', vegetableOptions, 0),
    createOptionGroup('option_two', 'Option 2', spiceOptions, 1),
  ],
  extras: [createExtra('Thêm pate', 5_000)],
});

export const createProductExamples = {
  saleProduct: {
    summary: 'Sản phẩm có flash sale và hai nhóm lựa chọn',
    value: saleProductExample,
  },
  nonSaleProduct: {
    summary: 'Sản phẩm không có flash sale, chỉ một nhóm lựa chọn',
    value: nonSaleProductExample,
  },
};

const updateProductWithExtras: UpdateProductReqDto = {
  name: 'Trà sữa Oolong nâng cấp',
  price: 48_000,
  optionGroups: [
    createOptionGroup(
      'option_one',
      'Option 1',
      [
        { id: 501, name: 'Ly nhỏ', price: 0 },
        { id: 502, name: 'Ly lớn', price: 6_000 },
        { name: 'Ly siêu lớn', price: 8_000 },
      ],
      0,
      301,
    ),
    createOptionGroup(
      'option_two',
      'Option 2',
      [
        { id: 503, name: 'Ít đường', price: 0 },
        { id: 504, name: 'Không đường', price: 0 },
      ],
      1,
      302,
    ),
  ],
  extras: [createExtra('Trân châu trắng', 7_500, 201), createExtra('Thạch sương sáo', 6_500)],
};

export const updateProductExamples = {
  updateWithExtras: {
    summary: 'Cập nhật sản phẩm với option groups và extras (bao gồm id)',
    value: updateProductWithExtras,
  },
};

export default createProductExamples;
