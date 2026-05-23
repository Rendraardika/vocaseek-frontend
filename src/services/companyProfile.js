import api from "../lib/api";
import { normalizeAssetUrl } from "../utils/media";

const COMPANY_PROFILE_ENDPOINT = "/company/profile";
const COMPANY_PROFILE_UPDATE_ENDPOINT = "/company/profile/update";

export function getCompanyProfile() {
  return api.get(COMPANY_PROFILE_ENDPOINT);
}

export function updateCompanyProfile(payload) {
  return api.post(COMPANY_PROFILE_UPDATE_ENDPOINT, payload);
}

export function getCompanyProfileData(response) {
  const source = response?.data?.data || response?.data || {};

  return {
    ...source,
    nama_perusahaan:
      source?.nama_perusahaan || source?.company_name || source?.name || "",
    industri: source?.industri || source?.industry || "",
    ukuran_perusahaan:
      source?.ukuran_perusahaan || source?.company_size || source?.size || "",
    website_url: source?.website_url || source?.website || "",
    deskripsi: source?.deskripsi || source?.description || "",
    visi: source?.visi || source?.vision || "",
    misi: source?.misi || source?.mission || "",
    notelp: source?.notelp || source?.phone || "",
    alamat_kantor_pusat:
      source?.alamat_kantor_pusat || source?.alamat_kantor || source?.address || "",
    linkedin_url: source?.linkedin_url || source?.linkedin || "",
    instagram_url: source?.instagram_url || source?.instagram || "",
    twitter_url: source?.twitter_url || source?.twitter || "",
    logo_url: normalizeAssetUrl(
      source?.logo_url ||
        source?.logo_perusahaan ||
        source?.logo ||
        source?.company_logo ||
        "",
    ),
    banner_url: normalizeAssetUrl(
      source?.banner_url || source?.banner || source?.cover_url || "",
    ),
  };
}

export function getCompanyFallbackLogo(name) {
  const source = String(name || "Company")
    .replace(/^pt\.?\s*/i, "")
    .trim();

  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return initials || "CO";
}
