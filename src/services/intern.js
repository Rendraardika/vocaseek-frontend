import api from "../lib/api";

export function getInternProfile() {
  return api.get("/intern/profile");
}

export function getInternTestQuestions() {
  return api.get("/intern/test/questions");
}

export function updateInternProfile(payload) {
  return api.put("/intern/update-profile", payload);
}

export function startInternTest() {
  return api.post("/intern/start-test");
}

export function submitInternTest(payload) {
  return api.post("/intern/submit-test", payload);
}

export function applyInternJob(payload) {
  return api.post("/intern/apply", payload);
}

export function getInternApplications() {
  return api.get("/intern/applications");
}
