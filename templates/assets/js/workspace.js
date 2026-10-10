"use strict";

const API = {
  user: "/users/user_detail",
  profile: "/profile/profile-detail",
  tasks: "/tasks/list-tasks",
  createTask: "/tasks/create",
  completeTask: (id) => "/tasks/update-task-complete/" + id,
  updateTask: (id) => "/tasks/update-task/" + id,
  deleteTask: (id) => "/tasks/task/" + id,
  deleteProfile: "/profile/profile-information",
  uploadAvatar: "/profile/upload-avatarf2",
};

const PAGE_SIZE = 100;
const REFRESH_INTERVAL = 15000;
const numberFormat = new Intl.NumberFormat("fa-IR");

const elements = {
  search: document.querySelector("#searchInput"),
  taskList: document.querySelector("#taskList"),
  emptyState: document.querySelector("#emptyState"),
  loadingState: document.querySelector("#loadingState"),
  pendingTasks: document.querySelector("#pendingTasks"),
  pendingCount: document.querySelector("#pendingCount"),
  pendingEmpty: document.querySelector("#pendingEmpty"),
  taskDialog: document.querySelector("#taskDialog"),
  taskForm: document.querySelector("#taskForm"),
  deleteDialog: document.querySelector("#deleteDialog"),
  profileDialog: document.querySelector("#profileDialog"),
  profileForm: document.querySelector("#profileForm"),
  profileMenu: document.querySelector("#profileMenu"),
  profileMenuButton: document.querySelector("#profileMenuButton"),
  toastContainer: document.querySelector("#toastContainer"),
};

let tasks = [];
let currentFilter = "all";
let profileExists = false;
let profileLoaded = false;
let profileData = null;
let loading = false;
let queuedRefresh = false;
let pendingDeleteId = null;
let avatarPreviewUrl = null;
let displayedCalendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

class ApiError extends Error {
  constructor(messages, status) {
    super(messages[0] || "درخواست ناموفق بود.");
    this.messages = messages;
    this.status = status;
  }
}

function translateApiMessage(detail, status) {
  const message = typeof detail === "string" ? detail : "";
  const normalized = message.toLowerCase();

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

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data && data.detail;
    const messages = Array.isArray(detail)
      ? detail.map((item) => item.msg || "اطلاعات واردشده معتبر نیست.")
      : [translateApiMessage(detail, response.status)];
    throw new ApiError(messages, response.status);
  }
  return data;
}

function showToasts(messages, type) {
  const kind = type || "error";

  messages.forEach((message) => {
    const toast = document.createElement("div");
    toast.className = "workspace-toast toast-" + kind;
    toast.setAttribute("role", "status");

    const text = document.createElement("span");
    text.textContent = message;

    const close = document.createElement("button");
    close.type = "button";
    close.className = "workspace-toast-close";
    close.setAttribute("aria-label", "بستن اعلان");
    close.textContent = "×";

    let timer;
    function dismiss() {
      clearTimeout(timer);
      toast.classList.remove("is-visible");
      toast.classList.add("is-leaving");
      window.setTimeout(() => toast.remove(), 260);
    }

    close.addEventListener("click", dismiss);
    toast.append(text, close);
    elements.toastContainer.append(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    timer = window.setTimeout(dismiss, 5000);
  });
}

function showError(error) {
  const messages = error.messages || [error.message || "خطای پیش‌بینی‌نشده رخ داد."];
  showToasts(messages, "error");
}

function setUserIdentity(user, profile) {
  const fullName = [profile && profile.first_name, profile && profile.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const displayName = fullName || user.username || "کاربر";

  document.querySelector("#welcomeTitle").textContent = "صبح بخیر، " + displayName;
  document.querySelector("#profileName").textContent = displayName;
  document.querySelector("#userAvatar").textContent = displayName.charAt(0) || "؟";
}

async function loadProfile() {
  try {
    const profile = await request(API.profile);
    profileExists = true;
    profileLoaded = true;
    profileData = profile;
    fillProfileForm(profile);
    return profile;
  } catch (error) {
    if (error.status === 404) {
      profileExists = false;
      profileLoaded = true;
      profileData = null;
      fillProfileForm(null);
      return null;
    }
    throw error;
  }
}

function fillProfileForm(profile) {
  const form = elements.profileForm;
  for (const name of ["bio", "national_id", "first_name", "last_name", "gender", "postal_code", "address"]) {
    form.elements[name].value = (profile && profile[name]) || "";
  }
  form.elements.date_of_birth.value =
    profile && profile.date_of_birth ? profile.date_of_birth.slice(0, 10) : "";

  // endpoint ویرایش فعلی کد ملی تکراری را درست استثنا نمی‌کند.
  // در پروفایل موجود، کد ملی از فرم قابل تغییر نیست.
  form.elements.national_id.readOnly = Boolean(profile);
  document.querySelector("#deleteProfileButton").hidden = !profile;

  showAvatarPreview(null);
  document.querySelector("#profileAvatar").value = "";
}

async function loadAllTasks() {
  const results = [];
  let offset = 0;

  while (true) {
    const page = await request(
      API.tasks + "?limit=" + PAGE_SIZE + "&offset=" + offset
    );
    if (!Array.isArray(page)) {
      throw new Error("پاسخ فهرست تسک‌ها قالب مورد انتظار را ندارد.");
    }

    results.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return results;
}

async function loadWorkspace(options = {}) {
  if (loading) {
    if (options.force) queuedRefresh = true;
    return;
  }
  loading = true;
  elements.loadingState.hidden = false;

  try {
    const data = await Promise.all([
      request(API.user),
      loadAllTasks(),
    ]);

    tasks = data[1];
    if (!profileLoaded) await loadProfile();
    setUserIdentity(data[0], profileData);
    renderTaskLists();
  } catch (error) {
    if (!options.silent) showError(error);

    if (error.status === 401) {
      window.setTimeout(() => window.location.assign("/"), 1500);
    }
  } finally {
    loading = false;
    elements.loadingState.hidden = true;
    if (queuedRefresh) {
      queuedRefresh = false;
      loadWorkspace({ silent: true });
    }
  }
}

function renderTaskLists() {
  renderTasks();
  renderPendingTasks();
}

function renderPendingTasks() {
  const pending = tasks.filter((task) => !task.is_completed);
  elements.pendingCount.textContent = numberFormat.format(pending.length);
  elements.pendingTasks.replaceChildren();

  pending.slice(0, 6).forEach((task) => {
    const item = document.createElement("article");
    item.className = "upcoming-item";

    const mark = document.createElement("span");
    mark.className = "upcoming-check";
    mark.setAttribute("aria-hidden", "true");

    const title = document.createElement("span");
    title.className = "upcoming-copy";
    title.textContent = task.title;

    item.append(mark, title);
    elements.pendingTasks.append(item);
  });

  elements.pendingEmpty.hidden = pending.length !== 0;
}

function renderCalendar() {
  const today = new Date();
  const year = displayedCalendarMonth.getFullYear();
  const month = displayedCalendarMonth.getMonth();
  const monthFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", {
    month: "long",
    year: "numeric",
  });
  const dayFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", {
    weekday: "short",
  });

  document.querySelector("#calendarMonth").textContent =
    monthFormatter.format(displayedCalendarMonth);

  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, 7 + index);
    const label = document.createElement("span");
    label.textContent = dayFormatter.format(date);
    return label;
  });
  const weekdayContainer = document.querySelector("#calendarWeekdays");
  weekdayContainer.replaceChildren(...weekdays);

  const firstWeekday = new Date(year, month, 1).getDay();
  const firstDate = new Date(year, month, 1 - firstWeekday);
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      firstDate.getFullYear(),
      firstDate.getMonth(),
      firstDate.getDate() + index
    );
    const cell = document.createElement("span");
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    cell.className = "calendar-date";
    if (date.getMonth() !== month) cell.classList.add("outside-month");
    if (isToday) {
      cell.classList.add("is-today");
      cell.setAttribute("aria-current", "date");
    }
    cell.setAttribute("role", "gridcell");
    cell.textContent = numberFormat.format(date.getDate());
    return cell;
  });
  document.querySelector("#calendarDays").replaceChildren(...days);
}

for (const [id, offset] of [["previousMonth", -1], ["nextMonth", 1]]) {
  document.getElementById(id).addEventListener("click", () => {
    displayedCalendarMonth = new Date(
      displayedCalendarMonth.getFullYear(),
      displayedCalendarMonth.getMonth() + offset, 1
    );
    renderCalendar();
  });
}

function visibleTasks() {
  const query = elements.search.value.trim().toLocaleLowerCase("fa-IR");

  return tasks.filter((task) => {
    const filterMatches =
      currentFilter === "all" ||
      (currentFilter === "pending" && !task.is_completed) ||
      (currentFilter === "completed" && task.is_completed);
    const text = (task.title + " " + (task.description || "")).toLocaleLowerCase("fa-IR");
    return filterMatches && text.includes(query);
  });
}

function priorityLabel(value) {
  return { low: "کم", medium: "متوسط", high: "زیاد" }[value] || "متوسط";
}

function makeTaskButton(label, action, className, disabled) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.dataset.action = action;
  button.textContent = label;
  button.disabled = Boolean(disabled);
  return button;
}

function renderTasks() {
  const completed = tasks.filter((task) => task.is_completed).length;
  document.querySelector("#totalCount").textContent = numberFormat.format(tasks.length);
  document.querySelector("#doneCount").textContent = numberFormat.format(completed);
  document.querySelector("#remainingCount").textContent =
    numberFormat.format(tasks.length - completed);

  const titles = {
    all: "تسک‌های من",
    pending: "تسک‌های انجام‌نشده",
    completed: "تسک‌های انجام‌شده",
  };
  document.querySelector("#taskHeading").textContent = titles[currentFilter];

  const visible = visibleTasks();
  elements.taskList.replaceChildren();

  visible.forEach((task) => {
    const row = document.createElement("article");
    row.className = "task-row" + (task.is_completed ? " is-done" : "");
    row.dataset.id = String(task.id);

    const toggle = makeTaskButton(
      task.is_completed ? "✓" : "○",
      "complete",
      "task-toggle",
      task.is_completed
    );
    toggle.setAttribute("aria-pressed", String(task.is_completed));
    toggle.setAttribute(
      "aria-label",
      task.is_completed ? "تسک انجام شده" : "علامت‌گذاری به‌عنوان انجام‌شده"
    );

    const copy = document.createElement("div");
    copy.className = "task-copy";
    const title = document.createElement("strong");
    title.textContent = task.title;
    copy.append(title);

    if (task.description) {
      const description = document.createElement("span");
      description.textContent = task.description;
      copy.append(description);
    }

    const priority = document.createElement("span");
    priority.className = "priority " + task.grading;
    priority.textContent = priorityLabel(task.grading);

    const actions = document.createElement("div");
    actions.className = "task-actions";
    actions.append(
      makeTaskButton("ویرایش", "edit", "task-edit", false),
      makeTaskButton("حذف", "delete", "task-delete", false)
    );

    row.append(toggle, copy, priority, actions);
    elements.taskList.append(row);
  });

  elements.emptyState.hidden = visible.length > 0;
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === filter);
  });
  renderTasks();
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

elements.search.addEventListener("input", renderTasks);

function openTaskDialog(task) {
  elements.taskForm.reset();
  document.querySelector("#taskId").value = task ? String(task.id) : "";
  document.querySelector("#taskDialogTitle").textContent =
    task ? "ویرایش تسک" : "افزودن تسک";
  if (task) {
    elements.taskForm.elements.title.value = task.title || "";
    elements.taskForm.elements.description.value = task.description || "";
    elements.taskForm.elements.grading.value = task.grading || "medium";
  }
  elements.taskDialog.showModal();
  document.querySelector("#taskTitle").focus();
}

document.querySelector("#openTaskForm").addEventListener("click", () => openTaskDialog(null));
document.querySelector("#closeTaskForm").addEventListener("click", () => elements.taskDialog.close());

elements.taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const values = new FormData(elements.taskForm);
  const id = values.get("id");
  const payload = {
    title: String(values.get("title")).trim(),
    description: String(values.get("description") || "").trim() || null,
    grading: values.get("grading"),
  };

  try {
    // category_id_fk را نمی‌فرستیم تا schema مقدار پیش‌فرض ۱ را اعمال کند.
    // validator فعلی بک‌اند برای category_id_fk ورودی صریح را خراب می‌کند.
    const savedTask = await request(id ? API.updateTask(id) : API.createTask, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    elements.taskDialog.close();
    if (savedTask) {
      if (id) {
        tasks = tasks.map((task) => task.id === Number(id) ? savedTask : task);
      } else {
        tasks = [savedTask, ...tasks.filter((task) => task.id !== savedTask.id)];
      }
      renderTaskLists();
    }
    await loadWorkspace({ silent: true, force: true });
    showToasts([id ? "تسک ویرایش شد." : "تسک جدید ساخته شد."], "success");
  } catch (error) {
    showError(error);
  }
});

elements.taskList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  const row = event.target.closest(".task-row");
  if (!button || !row) return;

  const task = tasks.find((item) => item.id === Number(row.dataset.id));
  if (!task) return;

  if (button.dataset.action === "edit") {
    openTaskDialog(task);
    return;
  }

  if (button.dataset.action === "delete") {
    pendingDeleteId = task.id;
    document.querySelector("#deleteDialogMessage").textContent =
      "تسک «" + task.title + "» حذف شود؟";
    document.querySelector("#deleteDialog").showModal();
    return;
  }

  if (button.dataset.action === "complete" && !task.is_completed) {
    try {
      await request(API.completeTask(task.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: true }),
      });
    } catch (error) {
      // مسیر فعلی ممکن است پس از commit در ساخت پاسخ خطا دهد؛
      // فهرست را دوباره می‌گیریم تا وضعیت ذخیره‌شده را بررسی کنیم.
      try {
        tasks = await loadAllTasks();
        renderTaskLists();
      } catch (refreshError) {
        showError(refreshError);
      }
      const updated = tasks.find((item) => item.id === task.id);
      if (updated && updated.is_completed) {
        showToasts(["تسک انجام‌شده علامت خورد."], "success");
        return;
      }
      showError(error);
      return;
    }

    tasks = tasks.map((item) => item.id === task.id
      ? { ...item, is_completed: true }
      : item);
    renderTaskLists();
    await loadWorkspace({ silent: true, force: true });
    showToasts(["تسک انجام‌شده علامت خورد."], "success");
  }
});

document.querySelector("#cancelDelete").addEventListener("click", () => {
  pendingDeleteId = null;
  document.querySelector("#deleteDialog").close();
});

document.querySelector("#confirmDelete").addEventListener("click", async () => {
  if (pendingDeleteId === null) return;

  try {
    await request(API.deleteTask(pendingDeleteId), { method: "DELETE" });
    tasks = tasks.filter((task) => task.id !== pendingDeleteId);
    pendingDeleteId = null;
    document.querySelector("#deleteDialog").close();
    renderTaskLists();
    await loadWorkspace({ silent: true });
    showToasts(["تسک حذف شد."], "success");
  } catch (error) {
    showError(error);
  }
});

document.querySelector("#deleteDialog").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) {
    event.currentTarget.close();
    pendingDeleteId = null;
  }
});

function closeProfileMenu() {
  elements.profileMenu.hidden = true;
  elements.profileMenuButton.setAttribute("aria-expanded", "false");
}

elements.profileMenuButton.addEventListener("click", () => {
  const opening = elements.profileMenu.hidden;
  elements.profileMenu.hidden = !opening;
  elements.profileMenuButton.setAttribute("aria-expanded", String(opening));
});

document.addEventListener("click", (event) => {
  if (
    !elements.profileMenu.contains(event.target) &&
    !elements.profileMenuButton.contains(event.target)
  ) {
    closeProfileMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeProfileMenu();
});

document.querySelector("#openProfileForm").addEventListener("click", async () => {
  closeProfileMenu();
  try {
    await loadProfile();
    elements.profileDialog.showModal();
  } catch (error) {
    showError(error);
  }
});

document.querySelector("#closeProfileForm").addEventListener("click", () => {
  elements.profileDialog.close();
});

function showAvatarPreview(file) {
  const preview = document.querySelector("#profileAvatarPreview");

  if (avatarPreviewUrl) {
    URL.revokeObjectURL(avatarPreviewUrl);
    avatarPreviewUrl = null;
  }

  if (!file) {
    preview.removeAttribute("src");
    preview.classList.remove("is-visible");
    return;
  }

  avatarPreviewUrl = URL.createObjectURL(file);
  preview.src = avatarPreviewUrl;
  preview.classList.add("is-visible");
}

document.querySelector("#profileAvatar").addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    showAvatarPreview(null);
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png"];
  if (!allowedTypes.includes(file.type)) {
    event.target.value = "";
    showAvatarPreview(null);
    showToasts(["تصویر باید JPG یا PNG باشد."], "error");
    return;
  }

  if (file.size > 1024 * 1024) {
    event.target.value = "";
    showAvatarPreview(null);
    showToasts(["حجم تصویر باید حداکثر ۱ مگابایت باشد."], "error");
    return;
  }

  showAvatarPreview(file);
});

elements.profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = elements.profileForm;
  const profileData = {
    bio: form.elements.bio.value.trim() || null,
    first_name: form.elements.first_name.value.trim(),
    last_name: form.elements.last_name.value.trim(),
    date_of_birth: form.elements.date_of_birth.value || null,
    gender: form.elements.gender.value || null,
    postal_code: form.elements.postal_code.value.trim() || null,
    address: form.elements.address.value.trim() || null,
  };

  // برای ایجاد پروفایل، این سه فیلد در schema اجباری هستند.
  if (!profileExists) {
    profileData.national_id = form.elements.national_id.value.trim();
  }

  try {
    await request(profileExists ? "/profile/change-profile-information" : "/profile/create", {
      method: profileExists ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData),
    });
    profileExists = true;

    const avatar = document.querySelector("#profileAvatar").files[0];
    if (avatar) {
      const uploadData = new FormData();
      uploadData.append("avatar", avatar);
      await request(API.uploadAvatar, {
        method: "POST",
        body: uploadData,
      });
    }

    const profile = await loadProfile();
    const user = await request(API.user);
    setUserIdentity(user, profile);
    elements.profileDialog.close();
    showToasts(["پروفایل ذخیره شد."], "success");
  } catch (error) {
    showError(error);
  }
});

document.querySelector("#deleteProfileButton").addEventListener("click", async () => {
  if (!window.confirm("پروفایل کاربری حذف شود؟")) return;

  try {
    await request(API.deleteProfile, { method: "DELETE" });
    profileExists = false;
    profileLoaded = true;
    profileData = null;
    elements.profileForm.reset();
    document.querySelector("#deleteProfileButton").hidden = true;
    showAvatarPreview(null);
    elements.profileDialog.close();

    const user = await request(API.user);
    setUserIdentity(user, null);
    showToasts(["پروفایل کاربری حذف شد."], "success");
  } catch (error) {
    showError(error);
  }
});

document.querySelector("#logoutButton").addEventListener("click", async () => {
  closeProfileMenu();
  try {
    await request("/users/logout", { method: "POST" });
  } catch (error) {
    // حتی اگر کوکی منقضی شده باشد، صفحه ورود در ادامه باز می‌شود.
  }
  window.location.assign("/");
});

document.querySelector("#welcomeDate").textContent =
  new Intl.DateTimeFormat("fa-IR", { dateStyle: "full" }).format(new Date());

loadWorkspace();
renderCalendar();
window.setInterval(() => {
  if (!document.hidden) loadWorkspace({ silent: true });
}, REFRESH_INTERVAL);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) loadWorkspace({ silent: true });
});



// Ambient parallax: same pointer smoothing as the landing page.
(() => {
  const aurora = document.getElementById("workspaceAurora");
  if (!aurora) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0, animationId = null;
  function animateBackground() {
    currentX += (targetX - currentX) * 0.075;
    currentY += (targetY - currentY) * 0.075;
    aurora.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
    animationId = requestAnimationFrame(animateBackground);
  }
  function updatePointer(event) {
    if (reducedMotion.matches || event.pointerType === "touch") return;
    targetX = ((event.clientX / window.innerWidth - 0.5) * 2) * 75;
    targetY = ((event.clientY / window.innerHeight - 0.5) * 2) * 55;
  }
  function configureMotion() {
    if (animationId !== null) cancelAnimationFrame(animationId);
    animationId = null;
    if (reducedMotion.matches) {
      targetX = targetY = currentX = currentY = 0;
      aurora.style.transform = "translate3d(0,0,0)";
    } else animationId = requestAnimationFrame(animateBackground);
  }
  window.addEventListener("pointermove", updatePointer, {passive:true});
  document.addEventListener("pointerleave", () => {targetX=targetY=0;});
  window.addEventListener("blur", () => {targetX=targetY=0;});
  reducedMotion.addEventListener("change", configureMotion);
  configureMotion();
})();
