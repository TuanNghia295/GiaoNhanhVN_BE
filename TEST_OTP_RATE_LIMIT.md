# 🧪 Hướng dẫn Test API Rate Limiting OTP

## 📋 Tổng quan

API này giới hạn số lần gửi OTP cho mỗi số điện thoại:
- **Giới hạn**: Tối đa **3 lần** trong **1 giờ**
- **Hành động khi vượt quá**: Trả về lỗi `429 TOO_MANY_REQUESTS` với error code `Z007`

---

## 🔗 API Endpoints

### 1. **Gửi OTP** (API chính)
```
GET /zalo/send-otp?phone={phone_number}
```

**Ví dụ:**
```bash
curl -X GET "http://localhost:3000/zalo/send-otp?phone=0987654321"
```

**Response thành công:**
```json
{
  "status": 200,
  "message": "OTP sent successfully"
}
```

**Response khi vượt quá giới hạn (lần thứ 4):**
```json
{
  "statusCode": 429,
  "message": "zalo.error.otp_rate_limit_exceeded",
  "error": "Too Many Requests"
}
```

---

### 2. **Kiểm tra trạng thái Rate Limit** (API test)
```
GET /zalo/test-otp-rate-limit?phone={phone_number}
```

**Ví dụ:**
```bash
curl -X GET "http://localhost:3000/zalo/test-otp-rate-limit?phone=0987654321"
```

**Response:**
```json
{
  "phone": "0987654321",
  "currentCount": 2,
  "maxRequests": 3,
  "remainingRequests": 1,
  "isLimited": false,
  "rateLimitWindowMinutes": 60,
  "message": "Còn 1/3 lần gửi OTP."
}
```

**Response khi đã đạt giới hạn:**
```json
{
  "phone": "0987654321",
  "currentCount": 3,
  "maxRequests": 3,
  "remainingRequests": 0,
  "isLimited": true,
  "rateLimitWindowMinutes": 60,
  "message": "Đã đạt giới hạn 3 lần gửi OTP. Vui lòng thử lại sau 60 phút."
}
```

---

## 🧪 Kịch bản Test

### **Test Case 1: Gửi OTP lần đầu tiên**
```bash
# Bước 1: Kiểm tra trạng thái ban đầu
curl -X GET "http://localhost:3000/zalo/test-otp-rate-limit?phone=0912345678"

# Expected: currentCount = 0, remainingRequests = 3

# Bước 2: Gửi OTP lần 1
curl -X GET "http://localhost:3000/zalo/send-otp?phone=0912345678"

# Expected: Success

# Bước 3: Kiểm tra lại trạng thái
curl -X GET "http://localhost:3000/zalo/test-otp-rate-limit?phone=0912345678"

# Expected: currentCount = 1, remainingRequests = 2
```

---

### **Test Case 2: Gửi OTP đến giới hạn**
```bash
# Gửi lần 1
curl -X GET "http://localhost:3000/zalo/send-otp?phone=0923456789"

# Gửi lần 2
curl -X GET "http://localhost:3000/zalo/send-otp?phone=0923456789"

# Gửi lần 3
curl -X GET "http://localhost:3000/zalo/send-otp?phone=0923456789"

# Kiểm tra trạng thái
curl -X GET "http://localhost:3000/zalo/test-otp-rate-limit?phone=0923456789"

# Expected: currentCount = 3, remainingRequests = 0, isLimited = true
```

---

### **Test Case 3: Vượt quá giới hạn**
```bash
# Sau khi đã gửi 3 lần, thử gửi lần 4
curl -X GET "http://localhost:3000/zalo/send-otp?phone=0923456789"

# Expected: HTTP 429 - Too Many Requests
# Error code: Z007 (zalo.error.otp_rate_limit_exceeded)
```

---

### **Test Case 4: Số điện thoại khác nhau**
```bash
# Số điện thoại A
curl -X GET "http://localhost:3000/zalo/send-otp?phone=0911111111"

# Số điện thoại B (không bị ảnh hưởng bởi rate limit của A)
curl -X GET "http://localhost:3000/zalo/send-otp?phone=0922222222"

# Kiểm tra cả 2
curl -X GET "http://localhost:3000/zalo/test-otp-rate-limit?phone=0911111111"
curl -X GET "http://localhost:3000/zalo/test-otp-rate-limit?phone=0922222222"

# Expected: Mỗi số có counter riêng biệt
```

---

## 🔧 Postman Collection

### Import vào Postman:

```json
{
  "info": {
    "name": "OTP Rate Limit Test",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Send OTP",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/zalo/send-otp?phone={{testPhone}}",
          "host": ["{{baseUrl}}"],
          "path": ["zalo", "send-otp"],
          "query": [
            {
              "key": "phone",
              "value": "{{testPhone}}"
            }
          ]
        }
      }
    },
    {
      "name": "Check Rate Limit Status",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/zalo/test-otp-rate-limit?phone={{testPhone}}",
          "host": ["{{baseUrl}}"],
          "path": ["zalo", "test-otp-rate-limit"],
          "query": [
            {
              "key": "phone",
              "value": "{{testPhone}}"
            }
          ]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "testPhone",
      "value": "0987654321"
    }
  ]
}
```

---

## 📊 Giải thích Response Fields

| Field | Type | Mô tả |
|-------|------|-------|
| `phone` | string | Số điện thoại được kiểm tra |
| `currentCount` | number | Số lần đã gửi OTP trong khung thời gian |
| `maxRequests` | number | Số lần tối đa cho phép (3) |
| `remainingRequests` | number | Số lần còn lại có thể gửi |
| `isLimited` | boolean | `true` nếu đã đạt giới hạn |
| `rateLimitWindowMinutes` | number | Thời gian reset (60 phút) |
| `message` | string | Thông báo chi tiết |

---

## 🗑️ Reset Rate Limit (Cho Testing)

Để reset rate limit của một số điện thoại trong quá trình test, bạn có thể:

1. **Đợi 1 giờ** (cache tự động expire)
2. **Xóa cache thủ công** (nếu dùng Redis):
   ```bash
   redis-cli DEL "auth:otp-limit:0987654321"
   ```
3. **Restart cache service**

---

## ⚠️ Lưu ý

- API test `test-otp-rate-limit` chỉ nên dùng trong môi trường development
- Trong production, nên xóa hoặc bảo vệ endpoint này
- Rate limit được tính theo số điện thoại, không phân biệt user
- Cache sử dụng TTL 1 giờ, sau đó tự động reset

---

## 🐛 Troubleshooting

### Vấn đề: Rate limit không hoạt động
- Kiểm tra cache service (Redis/Memory) đang chạy
- Xem logs để đảm bảo `cache.set()` thành công

### Vấn đề: Counter không tăng
- Kiểm tra `CacheKey.OTP_RATE_LIMIT` đã được định nghĩa đúng
- Verify `createCacheKey()` tạo key đúng format

### Vấn đề: Error code Z007 không hiển thị
- Kiểm tra file i18n/translation có message cho `zalo.error.otp_rate_limit_exceeded`
- Verify `ValidationException` được throw đúng cách
