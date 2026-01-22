# تقرير مشاكل الحجز وخطة الإصلاح

## 📋 ملخص المشاكل المكتشفة

### 1. مشكلة تجميع الأسعار (Price Calculation)

**المشكلة:**
- عند إرسال `serviceIds` فقط (بدون `price`)، يتم تعيين `price: 0` لجميع الخدمات
- الكود في السطر 304-308:
  ```javascript
  finalServices = normalizedServices.map(s => 
    typeof s === 'string' 
      ? { serviceId: s, id: s, price: 0 }  // ❌ المشكلة: price = 0
      : { ...s, serviceId: s.serviceId || s.id, id: s.serviceId || s.id }
  );
  ```
- عند حساب `totalAmount`، يتم جمع `venue.price + sum(services.prices)`، لكن إذا كانت `services.prices = 0`، فسيتم حساب سعر القاعة فقط
- **النتيجة:** السعر النهائي غير صحيح عند إرسال `serviceIds` بدون `price`

**الموقع في الكود:**
- `backend/src/controllers/BookingsController.js` - السطر 333-357

---

### 2. مشكلة منع الحجز المزدوج (Double Booking Prevention)

**المشكلة:**
- **لا يوجد تحقق من توفر القاعة** في `BookingsController.create()`
- الكود الحالي لا يتحقق من وجود حجوزات أخرى في نفس الوقت
- يوجد تحقق في `AdminController.updateBooking()` (السطر 2179-2215) لكن **لا يوجد في `BookingsController.create()`**

**الكود الموجود في AdminController (لكن غير موجود في BookingsController):**
```javascript
// Check for conflicts with other bookings
const conflictingBookings = await prisma.booking.findMany({
  where: {
    venueId: booking.venueId,
    id: { not: id },
    date: {
      gte: startOfDay,
      lte: endOfDay,
    },
    status: {
      not: 'CANCELLED',
    },
    OR: [
      // Time overlap checks...
    ],
  },
});
```

**الموقع في الكود:**
- `backend/src/controllers/BookingsController.js` - **مفقود تماماً**
- `backend/src/controllers/AdminController.js` - السطر 2179-2215 (موجود فقط في update)

---

### 3. مشكلة التحقق من الأوقات والأيام (Time & Date Validation)

**المشكلة:**
- **لا يوجد تحقق من `workingHours`** للقاعة
- **لا يوجد تحقق من `VenueHoliday`** (الأيام المحظورة)
- يوجد endpoints للتحقق (`getAvailableTimeSlots`, `getBookedDates`) لكن **لا يتم استدعاؤهم في `create()`**

**Endpoints الموجودة (لكن غير مستخدمة في create):**
- `GET /api/mobile/venues/:id/available-slots?date=YYYY-MM-DD` - موجود في `MobileController.getAvailableTimeSlots()`
- `GET /api/mobile/venues/:id/booked-dates` - موجود في `MobileController.getBookedDates()`

**الموقع في الكود:**
- `backend/src/controllers/MobileController.js` - السطر 276-373 (موجود)
- `backend/src/controllers/BookingsController.js` - **مفقود تماماً**

---

### 4. مشكلة جلب أسعار الخدمات (Service Price Fetching)

**المشكلة:**
- عند إرسال `serviceIds` فقط، يتم جلب الخدمات للتحقق منها (السطر 398-400) لكن **لا يتم استخدام `service.price`** في `finalServices`
- الكود يجلب `service.price` لكن لا يستخدمه في حساب السعر النهائي

**الموقع في الكود:**
- `backend/src/controllers/BookingsController.js` - السطر 359-414 (validation فقط، لا يتم استخدام price)

---

## 🔍 تحليل الكود الموجود

### ✅ ما هو موجود ويعمل:

1. **Availability Checking (للخدمات فقط):**
   - `MobileController.checkServiceAvailability()` - يتحقق من توفر الخدمة
   - `MobileController.getAvailableTimeSlots()` - يعرض الأوقات المتاحة للقاعة
   - `MobileController.getBookedDates()` - يعرض الأيام المحجوزة

2. **Conflict Detection (في Admin فقط):**
   - `AdminController.updateBooking()` - يتحقق من التعارضات عند التحديث

3. **Price Calculation (ناقص):**
   - يحسب `venue.price + services.prices` لكن `services.prices` قد تكون 0

### ❌ ما هو مفقود:

1. **Venue Availability Check في create():**
   - لا يوجد تحقق من توفر القاعة في نفس الوقت
   - لا يوجد تحقق من `workingHours`
   - لا يوجد تحقق من `VenueHoliday`

2. **Service Price Fetching:**
   - لا يتم جلب `service.price` من قاعدة البيانات عند إرسال `serviceIds` فقط

3. **Time Slot Validation:**
   - لا يتم التحقق من أن `startTime` و `endTime` ضمن `workingHours`

---

## 📝 خطة الإصلاح للـ Mobile App (Frontend)

### المرحلة 1: إصلاح تجميع الأسعار

**المشكلة:** عند إرسال `serviceIds` فقط، الأسعار = 0

**الحل:**
1. **في Mobile App:**
   - قبل إرسال الحجز، يجب جلب تفاصيل جميع الخدمات (`GET /api/mobile/services/:id`)
   - استخراج `price` من كل خدمة
   - إرسال `services` array مع `price` لكل خدمة:
     ```json
     {
       "services": [
         {
           "serviceId": "xxx",
           "price": 100.00
         },
         {
           "serviceId": "yyy",
           "price": 200.00
         }
       ]
     }
     ```

2. **أو في Backend (الأفضل):**
   - عند إرسال `serviceIds` فقط، يجب جلب `service.price` من قاعدة البيانات
   - استخدام `service.price` في `finalServices`

---

### المرحلة 2: إضافة التحقق من توفر القاعة

**المشكلة:** لا يوجد تحقق من الحجز المزدوج

**الحل:**
1. **في Mobile App:**
   - قبل إرسال الحجز، استدعاء `GET /api/mobile/venues/:id/available-slots?date=YYYY-MM-DD`
   - التحقق من أن `startTime` و `endTime` متاحين في الـ response
   - إذا لم يكن متاحاً، عرض رسالة خطأ للمستخدم

2. **أو في Backend (الأفضل):**
   - إضافة نفس منطق `AdminController.updateBooking()` في `BookingsController.create()`
   - رفض الحجز إذا كان هناك تعارض

---

### المرحلة 3: إضافة التحقق من الأوقات والأيام

**المشكلة:** لا يوجد تحقق من `workingHours` و `VenueHoliday`

**الحل:**
1. **في Mobile App:**
   - قبل إرسال الحجز، استدعاء `GET /api/mobile/venues/:id/booked-dates`
   - التحقق من أن التاريخ المختار ليس في قائمة `bookedDates`
   - التحقق من أن `startTime` و `endTime` ضمن `workingHours` (من `venue.workingHoursStart` و `venue.workingHoursEnd`)

2. **أو في Backend (الأفضل):**
   - إضافة التحقق من `workingHours` في `BookingsController.create()`
   - إضافة التحقق من `VenueHoliday` في `BookingsController.create()`

---

### المرحلة 4: تحسين تجربة المستخدم

**التحسينات المقترحة:**
1. **عرض الأسعار بشكل صحيح:**
   - جلب أسعار الخدمات قبل عرضها للمستخدم
   - عرض `venue.price + sum(services.prices)` بشكل صحيح

2. **منع الحجز المزدوج:**
   - عرض الأوقات المتاحة فقط في الـ UI
   - تعطيل الأوقات المحجوزة

3. **التحقق قبل الإرسال:**
   - التحقق من جميع البيانات قبل إرسال الحجز
   - عرض رسائل خطأ واضحة

---

## 🎯 الأولويات

### عالية الأولوية (يجب إصلاحها فوراً):
1. ✅ إصلاح تجميع الأسعار (جلب `service.price` من قاعدة البيانات)
2. ✅ إضافة التحقق من الحجز المزدوج في `create()`
3. ✅ إضافة التحقق من `workingHours` و `VenueHoliday`

### متوسطة الأولوية:
4. ✅ تحسين تجربة المستخدم في Mobile App
5. ✅ إضافة validation في Frontend قبل الإرسال

### منخفضة الأولوية:
6. ✅ تحسين رسائل الخطأ
7. ✅ إضافة logging أفضل

---

## 📊 ملخص التغييرات المطلوبة

### Backend Changes (يجب تطبيقها):
1. **BookingsController.create():**
   - إضافة جلب `service.price` عند إرسال `serviceIds` فقط
   - إضافة التحقق من توفر القاعة (conflict detection)
   - إضافة التحقق من `workingHours`
   - إضافة التحقق من `VenueHoliday`

### Frontend Changes (Mobile App):
1. **قبل إرسال الحجز:**
   - جلب أسعار الخدمات
   - التحقق من توفر القاعة
   - التحقق من الأوقات والأيام
   - عرض الأسعار بشكل صحيح

---

## 📱 خطة الإصلاح التفصيلية للـ Mobile App

### الخطوة 1: إصلاح تجميع الأسعار

**الملف:** `afrahona/lib/presentation/screens/booking/booking_confirmation_screen.dart`

**التغييرات المطلوبة:**

1. **قبل إرسال الحجز، جلب أسعار الخدمات:**
   ```dart
   // في _handleConfirmBooking()
   // 1. جلب تفاصيل جميع الخدمات
   List<Map<String, dynamic>> servicesWithPrices = [];
   for (var serviceId in serviceIds) {
     final service = await apiClient.get('/mobile/services/$serviceId');
     servicesWithPrices.add({
       'serviceId': serviceId,
       'id': serviceId,
       'price': service['price'] ?? 0.0, // ✅ جلب السعر من API
     });
   }
   
   // 2. حساب totalAmount
   double venuePrice = venue?['price'] ?? 0.0;
   double servicesTotal = servicesWithPrices.fold(0.0, (sum, s) => sum + (s['price'] ?? 0.0));
   double calculatedTotal = venuePrice + servicesTotal;
   
   // 3. إرسال services مع prices
   final bookingPayload = {
     'venueId': venueId,
     'services': servicesWithPrices, // ✅ إرسال services مع prices
     'totalAmount': calculatedTotal,
     // ... باقي البيانات
   };
   ```

2. **عرض الأسعار بشكل صحيح:**
   ```dart
   // في build method
   // عرض venue price
   Text('Venue: ${venue?['price'] ?? 0.0}'),
   
   // عرض services prices
   for (var service in servicesWithPrices)
     Text('${service['name']}: ${service['price'] ?? 0.0}'),
   
   // عرض total
   Text('Total: ${venuePrice + servicesTotal}'),
   ```

---

### الخطوة 2: إضافة التحقق من توفر القاعة

**الملف:** `afrahona/lib/presentation/screens/booking/booking_steps_screen.dart`

**التغييرات المطلوبة:**

1. **في _AppointmentStep (عند اختيار التاريخ والوقت):**
   ```dart
   // بعد اختيار date و time
   Future<void> _checkVenueAvailability() async {
     if (venueId == null || selectedDate == null || selectedTime == null) return;
     
     // 1. جلب الأوقات المتاحة
     final response = await apiClient.get(
       '/mobile/venues/$venueId/available-slots',
       queryParameters: {
         'date': selectedDate!.toIso8601String().split('T')[0],
       },
     );
     
     // 2. التحقق من أن الوقت المختار متاح
     final slots = response['slots'] as List;
     final formattedTime = _convertArabicTimeTo24Hour(selectedTime!);
     
     final isAvailable = slots.any((slot) => 
       slot['start'] == formattedTime && 
       slot['available'] == true
     );
     
     if (!isAvailable) {
       // عرض رسالة خطأ
       ScaffoldMessenger.of(context).showSnackBar(
         SnackBar(content: Text('هذا الوقت غير متاح')),
       );
       return;
     }
   }
   ```

2. **قبل الانتقال للخطوة التالية:**
   ```dart
   void _nextStep(Map<String, dynamic> stepData) {
     // التحقق من التوفر أولاً
     _checkVenueAvailability().then((_) {
       // إذا كان متاحاً، الانتقال للخطوة التالية
       widget.onNext(stepData);
     });
   }
   ```

---

### الخطوة 3: إضافة التحقق من الأيام المحجوزة

**الملف:** `afrahona/lib/presentation/screens/booking/booking_steps_screen.dart`

**التغييرات المطلوبة:**

1. **في _AppointmentStep (عند اختيار التاريخ):**
   ```dart
   Future<void> _loadBookedDates() async {
     if (venueId == null) return;
     
     // جلب الأيام المحجوزة
     final response = await apiClient.get(
       '/mobile/venues/$venueId/booked-dates',
     );
     
     final bookedDates = response['bookedDates'] as List;
     final fullyBookedDates = response['fullyBookedDates'] as List;
     
     // تحويل إلى Set للتحقق السريع
     _bookedDates = bookedDates.map((d) => DateTime.parse(d)).toSet();
     _fullyBookedDates = fullyBookedDates.map((d) => DateTime.parse(d)).toSet();
     
     setState(() {});
   }
   
   // في DatePicker
   selectableDayPredicate: (DateTime date) {
     // منع اختيار الأيام المحجوزة بالكامل
     return !_fullyBookedDates.contains(date);
   },
   ```

2. **عرض تحذير للأيام المحجوزة جزئياً:**
   ```dart
   if (_bookedDates.contains(selectedDate)) {
     // عرض تحذير: "هذا اليوم محجوز جزئياً، يرجى اختيار وقت متاح"
   }
   ```

---

### الخطوة 4: إضافة التحقق من Working Hours

**الملف:** `afrahona/lib/presentation/screens/booking/booking_steps_screen.dart`

**التغييرات المطلوبة:**

1. **جلب workingHours من venue:**
   ```dart
   // عند جلب تفاصيل venue
   final venue = await apiClient.get('/mobile/venues/$venueId');
   final workingHoursStart = venue['workingHoursStart'] ?? '09:00';
   final workingHoursEnd = venue['workingHoursEnd'] ?? '22:00';
   ```

2. **تصفية الأوقات المتاحة:**
   ```dart
   // في TimePicker
   List<String> availableTimes = [];
   
   // توليد الأوقات ضمن workingHours فقط
   int startHour = int.parse(workingHoursStart.split(':')[0]);
   int endHour = int.parse(workingHoursEnd.split(':')[0]);
   
   for (int hour = startHour; hour < endHour; hour++) {
     availableTimes.add('${hour.toString().padLeft(2, '0')}:00');
   }
   ```

---

### الخطوة 5: التحقق النهائي قبل الإرسال

**الملف:** `afrahona/lib/presentation/screens/booking/booking_confirmation_screen.dart`

**التغييرات المطلوبة:**

1. **إضافة validation function:**
   ```dart
   Future<bool> _validateBooking() async {
     // 1. التحقق من توفر القاعة
     final availabilityResponse = await apiClient.get(
       '/mobile/venues/${venueId}/available-slots',
       queryParameters: {
         'date': date.toIso8601String().split('T')[0],
       },
     );
     
     final slots = availabilityResponse['slots'] as List;
     final requestedSlot = slots.firstWhere(
       (slot) => slot['start'] == startTime && slot['available'] == true,
       orElse: () => null,
     );
     
     if (requestedSlot == null) {
       ScaffoldMessenger.of(context).showSnackBar(
         SnackBar(content: Text('هذا الوقت غير متاح')),
       );
       return false;
     }
     
     // 2. التحقق من الأسعار
     if (totalAmount <= 0) {
       ScaffoldMessenger.of(context).showSnackBar(
         SnackBar(content: Text('الرجاء التحقق من الأسعار')),
       );
       return false;
     }
     
     return true;
   }
   ```

2. **استخدام validation قبل الإرسال:**
   ```dart
   Future<void> _handleConfirmBooking() async {
     // التحقق أولاً
     final isValid = await _validateBooking();
     if (!isValid) return;
     
     // ثم إرسال الحجز
     // ...
   }
   ```

---

## 📋 قائمة الملفات التي تحتاج تعديل في Mobile App

### 1. `afrahona/lib/presentation/screens/booking/booking_confirmation_screen.dart`
- ✅ جلب أسعار الخدمات قبل الإرسال
- ✅ حساب totalAmount بشكل صحيح
- ✅ إرسال services مع prices
- ✅ التحقق النهائي قبل الإرسال

### 2. `afrahona/lib/presentation/screens/booking/booking_steps_screen.dart`
- ✅ جلب الأوقات المتاحة عند اختيار التاريخ
- ✅ جلب الأيام المحجوزة
- ✅ التحقق من workingHours
- ✅ منع اختيار الأوقات المحجوزة

### 3. `afrahona/lib/data/repositories/booking_repository.dart`
- ✅ إضافة method لجلب أسعار الخدمات
- ✅ إضافة method للتحقق من توفر القاعة

---

## 🔗 المراجع

- `backend/src/controllers/BookingsController.js` - السطر 159-601
- `backend/src/controllers/MobileController.js` - السطر 276-373 (available-slots)
- `backend/src/controllers/AdminController.js` - السطر 2179-2215 (conflict detection)
- `backend/prisma/schema.prisma` - Venue, Booking, VenueHoliday models

