# 🚀 دليل سريع لحجز الخدمات

## الخطوة 1: احصل على Service ID صحيح

### استدعي هذا الـ endpoint أولاً:
```http
GET {{base_url}}/api/mobile/services
Authorization: Bearer {{auth_token}}
```

### مثال على الرد:
```json
{
  "success": true,
  "services": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",  ← استخدم هذا ID
      "name": "Bridal Makeup",
      "nameAr": "مكياج العروس",
      "price": 400,
      "isActive": true
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",  ← أو هذا ID
      "name": "Hair Styling",
      "nameAr": "تصفيف الشعر",
      "price": 300,
      "isActive": true
    }
  ]
}
```

---

## الخطوة 2: استخدم Service ID في الحجز

### مثال بسيط - حجز خدمة واحدة:

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
      "serviceId": "550e8400-e29b-41d4-a716-446655440000"
    }
  ]
}
```

### مثال متقدم - حجز عدة خدمات:

```json
{
  "date": "2026-02-15T18:00:00.000Z",
  "startTime": "18:00",
  "endTime": "22:00",
  "location": "home",
  "locationAddress": "الرياض - حي النرجس",
  "totalAmount": 700.00,
  "services": [
    {
      "serviceId": "550e8400-e29b-41d4-a716-446655440000",
      "price": 400.00,
      "startTime": "18:00",
      "endTime": "20:00"
    },
    {
      "serviceId": "660e8400-e29b-41d4-a716-446655440001",
      "price": 300.00,
      "startTime": "20:00",
      "endTime": "22:00"
    }
  ]
}
```

---

## 📍 Endpoint:

```http
POST {{base_url}}/api/mobile/services/booking
Authorization: Bearer {{auth_token}}
Content-Type: application/json
```

---

## ⚠️ ملاحظات مهمة:

1. **Service ID يجب أن يكون UUID صحيح** (مثل: `550e8400-e29b-41d4-a716-446655440000`)
2. **لا تستخدم** IDs مثل `srv_makeup_001` - هذه غير صحيحة
3. **الحقول المطلوبة فقط:**
   - `date` (مطلوب)
   - `services` (مطلوب - مصفوفة تحتوي على خدمة واحدة على الأقل)
   - `totalAmount` (مطلوب)
4. **جميع الحقول الأخرى اختيارية**

---

## ✅ مثال جاهز للنسخ واللصق:

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
  "notes": "حفلة عيد ميلاد",
  "services": [
    {
      "serviceId": "ضع_Service_ID_هنا",
      "price": 400.00
    }
  ]
}
```

**⚠️ تذكر:** استبدل `ضع_Service_ID_هنا` بـ Service ID صحيح من الخطوة 1!



