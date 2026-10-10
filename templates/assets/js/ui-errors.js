function translateApiMessage(detail, status) {
  const message = typeof detail === "string" ? detail : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("username or email or phone number or password")) {
    return "اطلاعات ورود یا رمز عبور درست نیست.";
  }
  if (normalized.includes("username, email or phone number")) {
    return "نام کاربری، ایمیل یا شماره تلفن قبلاً ثبت شده است.";
  }
  if (normalized.includes("account is not active")) {
    return "این حساب کاربری فعال نیست.";
  }

  if (status === 401 || normalized.includes("please login")) {
    return "نشست ورود شما معتبر نیست؛ دوباره وارد حساب شو.";
  }
  if (status === 403 || normalized.includes("guest users")) {
    return "این عملیات برای سطح دسترسی حساب شما فعال نیست.";
  }
  if (normalized.includes("nationalid already in use") || normalized.includes("national id already in use")) {
    return "این کد ملی قبلاً برای حساب دیگری ثبت شده است.";
  }
  if (normalized.includes("profile not found")) {
    return "پروفایلی برای این حساب ثبت نشده است.";
  }
  if (normalized.includes("already exist")) {
    return "تسکی با این عنوان از قبل وجود دارد.";
  }
  if (normalized.includes("category id is invalid")) {
    return "دسته‌بندی پیش‌فرض تسک (شناسهٔ ۱) در پایگاه داده پیدا نشد.";
  }
  if (normalized.includes("task not found")) {
    return "تسک پیدا نشد؛ فهرست را تازه کن.";
  }
  if (status >= 500) {
    return "خطایی در سرور رخ داد. لطفاً دوباره تلاش کن.";
  }
  return message || "درخواست انجام نشد. لطفاً دوباره تلاش کن.";
}

export function errorMessages(error) {
  if (error.code === "INVALID_CATEGORY_LIST") return ["پاسخ فهرست دسته‌بندی‌ها معتبر نیست."];
  if (error.code === "INVALID_CATEGORY") return ["یک دسته‌بندی معتبر انتخاب کن."];
  if (error.code === "INVALID_JSON") return ["پاسخ سرور قالب JSON معتبری ندارد."];
  if (error.code === "INVALID_TASK_LIST") return ["پاسخ فهرست تسک‌ها قالب مورد انتظار را ندارد."];
  if (Array.isArray(error.detail)) {
    return error.detail.map((item) => item.msg || "اطلاعات واردشده معتبر نیست.");
  }
  return [translateApiMessage(error.detail || error.message, error.status)];
}
