import {
  AdminRevenueResDto,
  OrderStatusRevenueResDto,
} from '@/api/analytics/dto/admin-revenue.res.dto';
import { ProductsService } from '@/api/products/products.service';
import { StoresService } from '@/api/stores/stores.service';
import { ImportHeaderKeys, ImportHeaderLabels } from '@/constants/app.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import {
  categoryItems,
  extras,
  options,
  Order,
  products,
  storeMenus,
} from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { getOrderStatusLabel } from '@/utils/util';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

export type ParsedProductRow = Partial<Record<ImportHeaderKeys, string>>;
export const ImportProductHeaderMap: Record<string, ImportHeaderKeys> =
  Object.entries(ImportHeaderLabels).reduce(
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
      const existStore = await this.storesService.existByUserPhone(
        row.storePhone,
      );
      if (!existStore) {
        throw new ValidationException(ErrorCode.S001);
      }

      //--------------------------------------------------
      // Tạo mới sản phẩm
      //--------------------------------------------------
      await this.db.transaction(async (tx) => {
        const [existStoreMenu] = await this.db
          .select({
            id: storeMenus.id,
          })
          .from(storeMenus)
          .where(
            and(
              eq(storeMenus.storeId, existStore.storeId),
              eq(storeMenus.name, row.menuName),
            ),
          );
        if (!existStoreMenu) {
          throw new ValidationException(ErrorCode.SM001);
        }

        const [categoryItem] = await this.db
          .select({
            id: categoryItems.id,
          })
          .from(categoryItems)
          .where(and(eq(categoryItems.name, row.categoryName)));
        if (!categoryItem) {
          throw new ValidationException(ErrorCode.CI001);
        }

        console.log('Creating product:', row);
        const [createdProduct] = await tx
          .insert(products)
          .values({
            name: row.productName,
            price: +row.basePrice || 0,
            storeId: existStore.storeId,
            description: row.description,
            storeMenuId: existStoreMenu.id,
            categoryItemId: categoryItem.id,
          })
          .returning();

        // console.log('Created product:', createdProduct);
        if (Array.isArray(row.toppings) && Array.isArray(row.toppingPrices)) {
          if (row.toppings.length !== row.toppingPrices.length) {
            throw new ValidationException(ErrorCode.EX001);
          }
          const extraValues = row.toppings.map((topping, idx) => ({
            name: topping.trim(),
            price: Number(row.toppingPrices[idx]),
            productId: createdProduct.id,
          }));
          await tx.insert(extras).values(extraValues).returning();
          console.log('Created extras:', extraValues);
        }

        if (Array.isArray(row.sizes) && Array.isArray(row.sizePrices)) {
          if (row.sizes.length !== row.sizePrices.length) {
            throw new ValidationException(ErrorCode.EX001);
          }
          const optionValues = row.sizes.map((topping, idx) => ({
            name: topping.trim(),
            price: Number(row.toppingPrices[idx]),
            productId: createdProduct.id,
          }));

          await tx.insert(options).values(optionValues).returning();

          console.log('Created options:', optionValues);
        }
      });
    }
    return result;
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

  async createMainDetailSheet(
    worksheet: ExcelJS.Worksheet,
    all: OrderStatusRevenueResDto[],
  ) {
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

  async createMainSheet(
    worksheet: ExcelJS.Worksheet,
    analyticTotalRevenue: AdminRevenueResDto,
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
