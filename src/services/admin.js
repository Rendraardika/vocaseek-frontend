import api from "../lib/api";

const ADMIN_BASE = "/admin";

export function getAdminProfile() {
  return api.get(`${ADMIN_BASE}/profile`);
}

export function updateAdminProfile(payload) {
  return api.post(`${ADMIN_BASE}/profile/update`, payload);
}

export function changeAdminPassword(payload) {
  return api.put(`${ADMIN_BASE}/profile/change-password`, payload);
}

export function getAdminOverview() {
  return api.get(`${ADMIN_BASE}/overview`);
}

export function getAdminTalents(params) {
  return api.get(`${ADMIN_BASE}/talents`, { params });
}

export function getAdminTalent(id) {
  return api.get(`${ADMIN_BASE}/talents/${id}`);
}

export function deleteAdminTalent(id) {
  return api.delete(`${ADMIN_BASE}/talents/${id}`);
}

export function getAdminPartners(params) {
  return api.get(`${ADMIN_BASE}/partners`, { params });
}

export function getAdminPartnerDetail(id) {
  return api.get(`${ADMIN_BASE}/partners/${id}`);
}

export function createAdminPartner(payload) {
  return api.post(`${ADMIN_BASE}/partners`, payload);
}

export function deleteAdminPartner(id) {
  return api.delete(`${ADMIN_BASE}/partners/${id}`);
}

export function getAdminVerifications(params) {
  return api.get(`${ADMIN_BASE}/verification`, { params });
}

export function updateAdminVerificationReviewStatus(id, payload) {
  return api.put(`${ADMIN_BASE}/verification/${id}/review-status`, payload);
}

export function getAdminVerificationDetail(id) {
  return api.get(`${ADMIN_BASE}/verification/${id}/detail`);
}

export function finalizeAdminVerification(id, payload) {
  return api.post(`${ADMIN_BASE}/verification/${id}/final`, payload);
}

export function getManagedAdminUsers(params) {
  return api.get(`${ADMIN_BASE}/users-management`, { params });
}

export function inviteManagedAdminUser(payload) {
  return api.post(`${ADMIN_BASE}/users/invite`, payload);
}

export function updateManagedAdminUserStatus(id, payload) {
  return api.put(`${ADMIN_BASE}/users-management/${id}/status`, payload);
}

export function deleteManagedAdminUser(id) {
  return api.delete(`${ADMIN_BASE}/users-management/${id}`);
}

export function verifyAdminInvitation(params) {
  return api.get(`${ADMIN_BASE}/invitations/verify`, { params });
}

export function acceptAdminInvitation(payload) {
  return api.post(`${ADMIN_BASE}/invitations/accept`, payload);
}

export function resendAdminInvitation(payload) {
  return api.post(`${ADMIN_BASE}/invitations/resend`, payload);
}

export function cancelAdminInvitation(payload) {
  return api.post(`${ADMIN_BASE}/invitations/cancel`, payload);
}
