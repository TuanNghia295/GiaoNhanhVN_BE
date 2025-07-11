import {
  AdminRevenueResDto,
  OrderStatusRevenueResDto,
} from '@/api/analytics/dto/admin-revenue.res.dto';
import { DeliverRevenueResDto } from '@/api/analytics/dto/deliver-revenue.res.dto';
import { StoreRevenueResDto } from '@/api/analytics/dto/store-revenue.res.dto';
import { ProductsService } from '@/api/products/products.service';
import { StoresService } from '@/api/stores/stores.service';
import { ImportHeaderKeys, ImportHeaderLabels } from '@/constants/app.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import { categoryItems, extras, options, Order, products, storeMenus } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { getOrderStatusLabel } from '@/utils/util';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

export type ParsedProductRow = Partial<Record<ImportHeaderKeys, string>>;
export const ImportProductHeaderMap: Record<string, ImportHeaderKeys> = Object.entries(
  ImportHeaderLabels,
).reduce(
  (acc, [key, label]) => {
    acc[label] = key as ImportHeaderKeys;
    return acc;
  },
  {} as Record<string, ImportHeaderKeys>,
);

@Injectable()
export class ExcelsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly productsService: ProductsService,
    private readonly storesService: StoresService, // Replace with actual type
  ) {}

  async importProduct(file: Express.Multer.File) {
    const buffer = file.buffer;
    const result = await this.parseExcelBufferToData(buffer);

    for (const row of result) {
      //--------------------------------------------------
      // Kiểm tra xem sản phẩm đã tồn tại hay chưa
      //--------------------------------------------------
      const existStore = await this.storesService.existByUserPhone(row.storePhone);
      if (!existStore) {
        throw new ValidationException(ErrorCode.S001);
      }

      //--------------------------------------------------
      // Tạo mới sản phẩm
      //--------------------------------------------------
      await this.db.transaction(async (tx) => {
        const [categoryItem] = await this.db
          .select({
            id: categoryItems.id,
          })
          .from(categoryItems)
          .where(and(eq(categoryItems.name, row.categoryName)));
        if (!categoryItem) {
          throw new ValidationException(ErrorCode.CI001);
        }

        // Check if store menu exists, if not create it
        const storeMenu = await this.createSoreMenuIfNotExist(tx, existStore.storeId, row.menuName);

        console.log('Creating product:', row);
        const [createdProduct] = await tx
          .insert(products)
          .values({
            name: row.productName,
            price: +row.basePrice || 0,
            storeId: existStore.storeId,
            description: row.description,
            storeMenuId: storeMenu.id,
            categoryItemId: categoryItem.id,
          })
          .returning();

        // console.log('Created product:', createdProduct);

        const toppings = row.toppings?.split(',') || [];
        const toppingPrices = row.toppingPrices?.split(',').map(Number) || [];
        if (toppings.length > 0 && toppingPrices.length > 0) {
          if (toppings.length !== toppingPrices.length) {
            throw new ValidationException(ErrorCode.EX001);
          }
          const extraValues = toppings.map((topping, idx) => ({
            name: topping.trim(),
            price: toppingPrices[idx], // Sửa chỗ này
            productId: createdProduct.id,
          }));
          console.log('Creating extras:', extraValues);
          await tx.insert(extras).values(extraValues).returning();
          console.log('Created extras:', extraValues);
        }

        const sizes = row.sizes?.split(',') || [];
        const sizePrices = row.sizePrices?.split(',').map(Number) || [];
        if (sizes.length > 0 && sizePrices.length > 0) {
          if (sizes.length !== sizePrices.length) {
            throw new ValidationException(ErrorCode.EX001);
          }
          const optionValues = sizes.map((topping, idx) => ({
            name: topping.trim(),
            price: sizePrices[idx], // Sửa chỗ này
            productId: createdProduct.id,
          }));

          await tx.insert(options).values(optionValues).returning();

          console.log('Created options:', optionValues);
        }
      });
    }
    return result;
  }

  private async createSoreMenuIfNotExist(tx: DrizzleDB, storeId: number, menuName: string) {
    let [existStoreMenu] = await tx
      .select({
        id: storeMenus.id,
      })
      .from(storeMenus)
      .where(
        and(
          isNull(storeMenus.deletedAt),
          eq(storeMenus.storeId, storeId),
          eq(storeMenus.name, menuName),
        ),
      );

    if (!existStoreMenu) {
      console.log(`Creating new store menu: ${menuName} for storeId: ${storeId}`);
      [existStoreMenu] = await tx
        .insert(storeMenus)
        .values({
          storeId: storeId,
          name: menuName,
          // add other required fields here
        })
        .returning({ id: storeMenus.id });
    }
    console.log('Exist store menu:', existStoreMenu);
    return existStoreMenu;
  }

  async parseExcelBufferToData(buffer: Buffer): Promise<ParsedProductRow[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
    });
    const headers = jsonData[0] as string[];
    return jsonData
      .slice(1)
      .filter((row: string[]) => row.length > 0)
      .map((row: string[]) => {
        const rowData: Record<string, string> = {};
        headers.forEach((header, index) => {
          const key = ImportProductHeaderMap[header];
          rowData[key] = row[index];
        });
        return rowData;
      });
  }

  async createMainDetailSheet(worksheet: ExcelJS.Worksheet, all: OrderStatusRevenueResDto[]) {
    console.log('all', all);
    // Set the columns for the worksheet
    worksheet.columns = [
      {
        header: 'Trạng thái đơn hàng',
        key: 'status',
        width: 30,
      },
      {
        header: 'Số lượng đơn hàng',
        key: 'total_order',
        width: 30,
      },
      {
        header: 'Phí dịch vụ',
        key: 'total_user_service_fee',
        width: 30,
      },
      {
        header: 'Số tiền hàng',
        key: 'total_product_price',
        width: 30,
      },
      {
        header: 'Tổng phí bán hàng',
        key: 'total_store_service_fee',
        width: 30,
      },
      {
        header: 'Tổng % thu của shipper',
        key: 'total_deliver_service_fee',
        width: 30,
      },
      {
        header: 'Tổng phí voucher app',
        key: 'total_voucher_value',
        width: 30,
      },
      {
        header: 'Tổng thu nhập của app',
        key: 'total_app_revenue',
        width: 30,
      },
    ];

    all.forEach((item) => {
      worksheet.addRow({
        ...item,
        status: getOrderStatusLabel(item.status),
      });
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        //----------------------------------------------------
        // Định dạng hàng đầu tiên (tiêu đề)
        //---------------------------------------------------
        row.eachCell((cell) => {
          cell.font = { bold: true, size: 12 };
          cell.alignment = { horizontal: 'center' };
        });
      } else {
        //----------------------------------------------------
        // Format các hàng từ thứ 2 trở đi
        //---------------------------------------------------
        row.eachCell((cell, cellIndex) => {
          //---------------------------------------------
          // Định dạng các ô dữ liệu  trừ cột đầu tiên vì là tổng đơn hàng
          //---------------------------------------------
          if (typeof cell.value === 'number' && cellIndex > 2) {
            cell.numFmt = '#,##0.00';
          }
          cell.alignment = { horizontal: 'right' };
        });
      }

      //----------------------------------------------------
      // Định dạng viền cho tất cả các ô trong hàng
      //---------------------------------------------------
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });
  }

  async createMainSheet(worksheet: ExcelJS.Worksheet, analyticTotalRevenue: AdminRevenueResDto) {
    // Set the columns for the worksheet
    worksheet.columns = [
      {
        header: 'Tổng số lượng đơn',
        key: 'total_all_order',
        width: 30,
      },
      {
        header: 'Tổng phí bán hàng',
        key: 'total_all_store_service_fee',
        width: 30,
      },
      {
        header: 'Tổng % thu của shipper',
        key: 'total_all_deliver_service_fee',
        width: 30,
      },
      {
        header: 'Tổng phí voucher app',
        key: 'total_all_voucher_value',
        width: 30,
      },
      {
        header: 'Tổng thu nhập của app',
        key: 'total_all_app_revenue',
        width: 30,
      },
    ];
    worksheet.addRow({ ...analyticTotalRevenue });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        //----------------------------------------------------
        // Định dạng hàng đầu tiên (tiêu đề)
        //---------------------------------------------------
        row.eachCell((cell) => {
          cell.font = { bold: true, size: 12 };
          cell.alignment = { horizontal: 'center' };
        });
      } else {
        //----------------------------------------------------
        // Format các hàng từ thứ 2 trở đi
        //---------------------------------------------------
        row.eachCell((cell, cellIndex) => {
          //---------------------------------------------
          // Định dạng các ô dữ liệu  trừ cột đầu tiên vì là tổng đơn hàng
          //---------------------------------------------
          if (typeof cell.value === 'number' && cellIndex > 1) {
            cell.numFmt = '#,##0.00';
          }
          cell.alignment = { horizontal: 'right' };
        });
      }

      //----------------------------------------------------
      // Định dạng viền cho tất cả các ô trong hàng
      //---------------------------------------------------
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });
  }

  async createMainDeliverSheet(
    worksheet: ExcelJS.Worksheet,
    analyticDeliverRevenue: DeliverRevenueResDto,
  ) {
    console.log('analyticDeliverRevenue', analyticDeliverRevenue);
    // Set the columns for the worksheet
    worksheet.columns = [
      {
        header: 'Tổng số lượng đơn',
        key: 'total_all_orders',
        width: 30,
      },
      {
        header: 'Tổng số lượng đơn thành công',
        key: 'total_all_order_delivered',
        width: 30,
      },
      {
        header: 'Tổng số lượng đơn đã hủy',
        key: 'total_all_order_canceled',
        width: 30,
      },
      {
        header: 'Tổng thu nhập của shipper',
        key: 'total_all_income',
        width: 30,
      },
      {
        header: 'Tổng điểm hiện tại',
        key: 'total_all_deliver_point',
        width: 30,
      },
    ];
    worksheet.addRow({ ...analyticDeliverRevenue });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        //----------------------------------------------------
        // Định dạng hàng đầu tiên (tiêu đề)
        //---------------------------------------------------
        row.eachCell((cell) => {
          cell.font = { bold: true, size: 12 };
          cell.alignment = { horizontal: 'center' };
        });
      }

      //----------------------------------------------------
      // Định dạng viền cho tất cả các ô trong hàng
      //---------------------------------------------------
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });
  }

  async createMainStoreSheet(
    worksheet: ExcelJS.Worksheet,
    analyticStoreRevenue: StoreRevenueResDto,
  ) {
    // Set the columns for the worksheet
    worksheet.columns = [
      {
        header: 'Tổng số lượng đơn',
        key: 'total_all_order',
        width: 30,
      },
      {
        header: 'Tổng phí bán hàng',
        key: 'total_all_store_service_fee',
        width: 30,
      },
      {
        header: 'Tổng voucher shop',
        key: 'total_all_voucher_value',
        width: 30,
      },
      {
        header: 'Tổng thu nhập của shop',
        key: 'total_all_store_revenue',
        width: 30,
      },
    ];
    worksheet.addRow({ ...analyticStoreRevenue });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        //----------------------------------------------------
        // Định dạng hàng đầu tiên (tiêu đề)
        //---------------------------------------------------
        row.eachCell((cell) => {
          cell.font = { bold: true, size: 12 };
          cell.alignment = { horizontal: 'center' };
        });
      } else {
        //----------------------------------------------------
        // Format các hàng từ thứ 2 trở đi
        //---------------------------------------------------
        row.eachCell((cell, cellIndex) => {
          //---------------------------------------------
          // Định dạng các ô dữ liệu  trừ cột đầu tiên vì là tổng đơn hàng
          //---------------------------------------------
          if (typeof cell.value === 'number' && cellIndex > 1) {
            cell.numFmt = '#,##0.00';
          }
          cell.alignment = { horizontal: 'right' };
        });
      }

      //----------------------------------------------------
      // Định dạng viền cho tất cả các ô trong hàng
      //---------------------------------------------------
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });
  }

  async createOrdersSheet(worksheet: ExcelJS.Worksheet, orders: Order[]) {
    // Set the columns for the worksheet
    worksheet.columns = [
      { header: 'Mã đơn hàng', key: 'code', width: 20 },
      { header: 'Tên khách hàng', key: 'user.fullName', width: 25 },
      { header: 'Số điện thoại', key: 'user.phone', width: 20 },
      { header: 'Địa chỉ', key: 'addressTo', width: 40 },
      { header: 'Thời gian đặt hàng', key: 'createdAt', width: 20 },
      { header: 'Tổng tiền', key: 'total', width: 15 },
      { header: 'Phí ship', key: 'deliverServiceFee', width: 15 },
      { header: 'Phí dịch vụ', key: 'storeServiceFee', width: 15 },
      { header: 'Phí voucher', key: 'totalVoucher', width: 15 },
      { header: 'Trạng thái', key: 'status', width: 15 },
    ];

    orders.forEach((order) => {
      worksheet.addRow({
        ...order,
        deliverServiceFee: order.totalDelivery - order.incomeDeliver || 0,
        status: getOrderStatusLabel(order.status),
        'user.fullName': order.user?.fullName || 'N/A',
        'user.phone': order.user?.phone || 'N/A',
        'deliver.fullName': order.deliver?.fullName || 'N/A',
        'deliver.phone': order.deliver?.phone || 'N/A',
      });
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell) => {
          cell.font = { bold: true, size: 12 };
          cell.alignment = { horizontal: 'center' };
        });
      } else {
        row.eachCell((cell, cellIndex) => {
          if (cellIndex === 5) {
            // Thời gian đặt hàng
            cell.numFmt = 'dd/mm/yyyy hh:mm:ss';
            cell.alignment = { horizontal: 'center' };
          } else if (typeof cell.value === 'number') {
            // Các cột số
            if (typeof cell.value === 'number') {
              cell.numFmt = '#,##0.00';
            }
            cell.alignment = { horizontal: 'right' };
          } else {
            // Các cột còn lại
            cell.alignment = { horizontal: 'left' };
          }
          cell.alignment = { horizontal: 'left' };
        });
      }

      // Định dạng viền cho tất cả các ô trong hàng
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });
  }
}
