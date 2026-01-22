# مثال صحيح لحجز الخدمات

## 📋 متطلبات الحجز

### الحقول المطلوبة:
- `date` (مطلوب): تاريخ الحجز بصيغة ISO string
- `services` (مطلوب): مصفوفة من الخدمات (يجب أن تحتوي على خدمة واحدة على الأقل)
- `totalAmount` (مطلوب): المبلغ الإجمالي

### الحقول الاختيارية:
- `startTime`: وقت البداية (HH:mm)
- `endTime`: وقت النهاية (HH:mm)
- `location`: نوع الموقع (home, hotel, outdoor, other)
- `locationAddress`: عنوان الموقع
- `locationLatitude`: خط العرض
- `locationLongitude`: خط الطول
- `discount`: الخصم (افتراضي: 0)
- `cardId`: معرف بطاقة الائتمان (اختياري - يمكن الدفع لاحقاً)
- `notes`: ملاحظات إضافية

---

## 📝 مثال 1: حجز خدمة واحدة (بدون venue)

```json
{
  "date": "2026-02-15T18:00:00.000Z",
  "startTime": "18:00",
  "endTime": "20:00",
  "location": "home",
  "locationAddress": "الرياض - حي النرجس - شارع الملك فهد",
  "locationLatitude": 24.7136,
  "locationLongitude": 46.6753,
  "totalAmount": 400.00,
  "discount": 0,
  "notes": "حفلة عيد ميلاد",
  "services": [
    {
      "serviceId": "SERVICE_UUID_HERE",
      "price": 400.00,
      "startTime": "18:00",
      "endTime": "20:00",
      "locationType": "home",
      "locationAddress": "الرياض - حي النرجس"
    }
  ]
}
```

---

## 📝 مثال 2: حجز عدة خدمات (بدون venue)

```json
{
  "date": "2026-02-15T18:00:00.000Z",
  "startTime": "18:00",
  "endTime": "22:00",
  "location": "home",
  "locationAddress": "الرياض - حي النرجس - شارع الملك فهد",
  "locationLatitude": 24.7136,
  "locationLongitude": 46.6753,
  "totalAmount": 800.00,
  "discount": 0,
  "notes": "حفلة زفاف - مكياج وتصفيف شعر",
  "services": [
    {
      "serviceId": "SERVICE_UUID_1",
      "price": 400.00,
      "startTime": "18:00",
      "endTime": "20:00",
      "locationType": "home",
      "locationAddress": "الرياض - حي النرجس"
    },
    {
      "serviceId": "SERVICE_UUID_2",
      "price": 400.00,
      "startTime": "20:00",
      "endTime": "22:00",
      "locationType": "home",
      "locationAddress": "الرياض - حي النرجس"
    }
  ]
}
```

---

## 📝 مثال 3: حجز مع دفع مسبق (cardId)

```json
{
  "date": "2026-02-15T18:00:00.000Z",
  "startTime": "18:00",
  "endTime": "20:00",
  "location": "home",
  "locationAddress": "الرياض - حي النرجس",
  "locationLatitude": 24.7136,
  "locationLongitude": 46.6753,
  "totalAmount": 400.00,
  "discount": 0,
  "cardId": "CARD_UUID_HERE",
  "notes": "حفلة عيد ميلاد",
  "services": [
    {
      "serviceId": "SERVICE_UUID_HERE",
      "price": 400.00
    }
  ]
}
```

---

## 📝 مثال 4: حجز بدون دفع (سيدفع لاحقاً)

```json
{
  "date": "2026-02-15T18:00:00.000Z",
  "startTime": "18:00",
  "endTime": "20:00",
  "location": "home",
  "locationAddress": "الرياض - حي النرجس",
  "totalAmount": 400.00,
  "services": [
    {
      "serviceId": "SERVICE_UUID_HERE",
      "price": 400.00
    }
  ]
}
```

---

## ⚠️ ملاحظات مهمة:

### 1. Service IDs:
- **يجب استخدام UUIDs صحيحة** من قاعدة البيانات
- **لا تستخدم** IDs مثل `srv_makeup_001` - هذه ليست UUIDs صحيحة
- للحصول على Service IDs صحيحة:
  ```
  GET {{base_url}}/api/mobile/services
  ```
  سيُرجع قائمة بجميع الخدمات مع IDs صحيحة

### 2. Service Object في services array:
- `serviceId` (مطلوب): UUID الخدمة
- `price` (اختياري): سعر الخدمة (سيستخدم السعر الافتراضي إذا لم يُحدد)
- `startTime` (اختياري): وقت البداية لهذه الخدمة
- `endTime` (اختياري): وقت النهاية لهذه الخدمة
- `locationType` (اختياري): نوع الموقع (home, hotel, outdoor, other)
- `locationAddress` (اختياري): عنوان الموقع لهذه الخدمة

### 3. Location Types:
- `home`: في المنزل
- `hotel`: في الفندق
- `outdoor`: في الهواء الطلق
- `other`: موقع آخر
- `venue`: في القاعة (يتطلب venueId)

### 4. Payment:
- إذا لم تُرسل `cardId`: سيتم إنشاء الحجز بدون دفع، ويمكن دفع الدفعة الأولية لاحقاً
- إذا أرسلت `cardId`: سيتم دفع الدفعة الأولية (30% من المبلغ الإجمالي) تلقائياً

---

## 🔍 كيفية الحصول على Service IDs صحيحة:

### خطوة 1: احصل على قائمة الخدمات
```http
GET {{base_url}}/api/mobile/services
Authorization: Bearer {{auth_token}}
```

### خطوة 2: اختر Service ID من النتيجة
```json
{
  "success": true,
  "services": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",  // ✅ استخدم هذا ID
      "name": "Bridal Makeup",
      "nameAr": "مكياج العروس",
      "price": 400,
      ...
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",  // ✅ استخدم هذا ID
      "name": "Hair Styling",
      "nameAr": "تصفيف الشعر",
      "price": 300,
      ...
    }
  ]
}
```

### خطوة 3: استخدم Service ID في الحجز
```json
{
  "services": [
    {
      "serviceId": "550e8400-e29b-41d4-a716-446655440000",  // ✅ UUID صحيح
      "price": 400.00
    }
  ]
}
```

---

## ✅ مثال كامل جاهز للاستخدام:

```json
{
  "date": "2026-02-15T18:00:00.000Z",
  "startTime": "18:00",
  "endTime": "20:00",
  "location": "home",
  "locationAddress": "الرياض - حي النرجس - شارع الملك فهد - مبنى 123",
  "locationLatitude": 24.7136,
  "locationLongitude": 46.6753,
  "totalAmount": 400.00,
  "discount": 0,
  "notes": "حفلة عيد ميلاد - يرجى الحضور في الوقت المحدد",
  "services": [
    {
      "serviceId": "550e8400-e29b-41d4-a716-446655440000",
      "price": 400.00,
      "startTime": "18:00",
      "endTime": "20:00",
      "locationType": "home",
      "locationAddress": "الرياض - حي النرجس"
    }
  ]
}
```

**ملاحظة:** استبدل `550e8400-e29b-41d4-a716-446655440000` بـ Service ID صحيح من قاعدة البيانات.

---

## 🚨 أخطاء شائعة:

### ❌ خطأ: استخدام Service ID خاطئ
```json
{
  "services": [
    {
      "serviceId": "srv_makeup_001"  // ❌ خطأ - هذا ليس UUID
    }
  ]
}
```

### ✅ صحيح: استخدام UUID صحيح
```json
{
  "services": [
    {
      "serviceId": "550e8400-e29b-41d4-a716-446655440000"  // ✅ صحيح
    }
  ]
}
```

---

## 📞 Endpoint:

```http
POST {{base_url}}/api/mobile/services/booking
Authorization: Bearer {{auth_token}}
Content-Type: application/json
```


