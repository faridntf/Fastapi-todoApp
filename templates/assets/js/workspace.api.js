import { request, jsonRequest, ApiError } from "./api-client.js";

const taskId = (id) => encodeURIComponent(id);

export const getUser = () => request("/users/user_detail");
export async function getProfile() {
  try {
    return await request("/profiles/profile-detail");
  } catch (error) {
    if (error.status === 404 && !error.code) return null;
    throw error;
  }
}
export function saveProfile(values, exists) {
  const data = {};
  for (const field of ["bio", "first_name", "last_name", "date_of_birth", "gender", "postal_code", "address"]) {
    data[field] = String(values[field] || "").trim() || null;
  }
  // The update endpoint does not exclude the current profile from duplicate checks.
  if (!exists) data.national_id = String(values.national_id || "").trim();
  return jsonRequest(exists ? "/profiles/change-profile-information" : "/profiles/create",
    exists ? "PATCH" : "POST", data);
}
export const deleteProfile = () => request("/profiles/profile-information", { method: "DELETE" });
export const logout = () => request("/users/logout", { method: "POST" });

export function uploadAvatar(file) {
  const body = new FormData();
  body.append("avatar", file);
  return request("/profiles/upload-avatar", { method: "POST", body });
}

export async function getAllTasks() {
  const pageSize = 100;
  const results = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await request(`/tasks/list-tasks?limit=${pageSize}&offset=${offset}`);
    if (!Array.isArray(page)) throw new ApiError("Invalid task list", { code: "INVALID_TASK_LIST" });
    results.push(...page);
    if (page.length < pageSize) return results;
  }
}

export async function getCategories() {
  let categories;
  try {
    categories = await request("/categories/categories");
  } catch (error) {
    if (error.status === 404 && error.detail === "list is empty, please create first category.") return [];
    throw error;
  }
  if (!Array.isArray(categories)) throw new ApiError("Invalid category list", { code: "INVALID_CATEGORY_LIST" });
  return categories;
}

function categoryId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ApiError("Invalid category", { code: "INVALID_CATEGORY" });
  }
  return id;
}

export function createTask({ title, description, grading, category_id_fk }) {
  return jsonRequest("/tasks/create", "POST", {
    title: title.trim(), description: description?.trim() || null, grading,
    category_id_fk: categoryId(category_id_fk),
  });
}

export function updateTask(id, { title, description, category_id_fk }) {
  // TaskUpdateSc forbids grading; only send supported fields.
  return jsonRequest(`/tasks/update-task/${taskId(id)}`, "PATCH", {
    title: title.trim(), description: description?.trim() || null,
    category_id_fk: categoryId(category_id_fk),
  });
}

export async function completeTask(id) {
  try {
    await jsonRequest(`/tasks/update-task-complete/${taskId(id)}`, "PATCH", { is_completed: true });
  } catch (error) {
    // The backend may commit before failing to serialize its response.
    // Read back the persisted state; never retry this mutation automatically.
    let updated;
    try {
      updated = (await getAllTasks()).find((task) => task.id === id);
    } catch {
      throw error;
    }
    if (!updated?.is_completed) throw error;
  }
}
export const deleteTask = (id) => request(`/tasks/task/${taskId(id)}`, { method: "DELETE" });
