export function pickFirstValue(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

export function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeList(parsed);
      } catch {
        return [value];
      }
    }
  }
  return [value];
}

function hasPositiveNumber(value) {
  if (value === null || value === undefined || value === "") return false;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0;
}

function resolveNestedDocumentValue(item = {}) {
  const previewUrl = item?.preview_url || item?.previewUrl;
  const documentValue = item?.document || item?.document_file || item?.documentFile;
  const supportingDocument =
    item?.supporting_document || item?.supportingDocument;

  return pickFirstValue(
    typeof previewUrl === "string" ? previewUrl : "",
    previewUrl?.url,
    previewUrl?.file,
    previewUrl?.document,
    typeof documentValue === "string" ? documentValue : "",
    documentValue?.url,
    documentValue?.file,
    typeof supportingDocument === "string" ? supportingDocument : "",
    supportingDocument?.url,
    supportingDocument?.file,
  );
}

function normalizeExperienceItem(item) {
  if (!item || typeof item !== "object") {
    return {
      title: String(item || "Pengalaman"),
      subtitle: "-",
      period: "",
      documentUrl: "",
      documentName: "",
    };
  }

  const start = pickFirstValue(item.mulai, item.start_date, item.started_at);
  const end = pickFirstValue(item.akhir, item.end_date, item.ended_at);
  const documentUrl = normalizeTalentAssetUrl(
    pickFirstValue(
      item.document_url,
      item.documentUrl,
      item.preview_url,
      item.previewUrl,
      item.file_url,
      item.fileUrl,
      item.url,
      item.document,
      item.document_file,
      item.documentFile,
      item.document_pdf,
      item.document_path,
      item.documentPath,
      item.file,
      item.file_path,
      item.filePath,
      item.path,
      item.dokumen,
      item.supporting_document,
      item.supporting_document_url,
      item.supportingDocument,
      item.supportingDocumentUrl,
      item.attachment_url,
      item.attachmentUrl,
      resolveNestedDocumentValue(item),
    ),
  );

  return {
    ...item,
    title: pickFirstValue(item.posisi, item.jabatan, item.title, "Pengalaman"),
    subtitle: pickFirstValue(
      item.perusahaan,
      item.company,
      item.organisasi,
      item.organization,
      item.jenis,
      item.deskripsi,
      "-",
    ),
    period: pickFirstValue(
      item.periode,
      item.period,
      item.tanggal,
      item.date_range,
      item.dateRange,
      item.duration,
      item.rentang_tanggal,
      start && end ? `${start} - ${end}` : "",
      start,
      end,
    ),
    documentUrl,
    documentName: pickFirstValue(
      item.documentName,
      item.document_name,
      item.file_name,
      item.filename,
      item.dokumen,
      documentUrl ? documentUrl.split("/").pop() : "",
    ),
  };
}

function normalizeCertificationItem(item) {
  if (!item || typeof item !== "object") {
    return {
      title: String(item || "Sertifikasi"),
      subtitle: "",
      documentUrl: "",
      documentName: "",
    };
  }
  const documentUrl = normalizeTalentAssetUrl(
    pickFirstValue(
      item.document_url,
      item.documentUrl,
      item.preview_url,
      item.previewUrl,
      item.file_url,
      item.fileUrl,
      item.url,
      item.document,
      item.document_file,
      item.documentFile,
      item.document_pdf,
      item.document_path,
      item.documentPath,
      item.file,
      item.file_path,
      item.filePath,
      item.path,
      item.dokumen,
      item.supporting_document,
      item.supporting_document_url,
      item.supportingDocument,
      item.supportingDocumentUrl,
      item.attachment_url,
      item.attachmentUrl,
      resolveNestedDocumentValue(item),
    ),
  );

  return {
    ...item,
    title: pickFirstValue(
      item.nama,
      item.name,
      item.title,
      item.sertifikasi,
      "Sertifikasi",
    ),
    subtitle: pickFirstValue(
      item.penerbit,
      item.issuer,
      item.organisasi,
      item.organization,
      item.nomor,
      item.certificate_number,
    ),
    documentUrl,
    documentName: pickFirstValue(
      item.documentName,
      item.document_name,
      item.file_name,
      item.filename,
      item.dokumen,
      documentUrl ? documentUrl.split("/").pop() : "",
    ),
  };
}

export function normalizeTalentStatus(value) {
  const status = String(value || "REVIEWING").toUpperCase();

  if (["ACCEPTED", "SHORTLISTED", "ACTIVE", "HIRED"].includes(status)) {
    return "ACCEPTED";
  }

  if (["REJECTED", "DECLINED", "INACTIVE"].includes(status)) {
    return "DECLINED";
  }

  return "REVIEWING";
}

export function formatTalentDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatBirthPlaceAndDate(place, dateValue) {
  const formattedDate = formatTalentDate(dateValue);
  if (place && formattedDate !== "-") return `${place}, ${formattedDate}`;
  return place || formattedDate || "-";
}

export function buildTalentAddress(source = {}) {
  const parts = [
    pickFirstValue(
      source.detail_alamat,
      source.addressDetail,
      source.alamat,
      source.address,
      source.address_domisili,
      source.domisili,
    ),
    pickFirstValue(source.kabupaten, source.city, source.kota, source.regency),
    pickFirstValue(source.provinsi, source.province, source.state),
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "-";
}

export function buildTalentDocument(fileUrl, fallbackLabel) {
  if (!fileUrl) {
    return {
      available: false,
      title: fallbackLabel,
      subtitle: "Belum ada file",
      url: "",
    };
  }

  return {
    available: true,
    title: fallbackLabel,
    subtitle: "",
    url: fileUrl,
  };
}

export function normalizeTalentAssetUrl(value) {
  if (!value) return "";

  const raw = String(value).trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;

  const apiBase =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

  try {
    const apiUrl = new URL(apiBase, window.location.origin);
    const origin = apiUrl.origin;
    const trimmed = raw.replace(/^\/+/, "");
    const normalizedPath = trimmed.startsWith("storage/")
      ? trimmed
      : `storage/${trimmed}`;

    return `${origin}/${normalizedPath}`;
  } catch {
    return raw;
  }
}

export function mapTalentDetailPayload(rawItem = {}) {
  const personal =
    rawItem?.personal ||
    rawItem?.pribadi ||
    rawItem?.data?.personal ||
    {};
  const user =
    rawItem?.user ||
    rawItem?.intern ||
    rawItem?.candidate ||
    rawItem?.data?.user ||
    {};
  const profile =
    user?.intern_profile ||
    user?.internProfile ||
    rawItem?.intern_profile ||
    rawItem?.internProfile ||
    rawItem?.profile ||
    rawItem?.data?.profile ||
    {};
  const academic =
    rawItem?.academic ||
    rawItem?.akademik ||
    rawItem?.education ||
    profile?.academic ||
    profile?.akademik ||
    {};
  const socials =
    personal?.socials ||
    personal?.social_media ||
    personal?.socialMedia ||
    {};
  const documents =
    rawItem?.documents ||
    rawItem?.dokumen ||
    rawItem?.files ||
    {};

  const name = pickFirstValue(
    rawItem?.nama,
    rawItem?.name,
    personal?.name,
    personal?.nama,
    user?.nama,
    "Talent",
  );
  const email = pickFirstValue(rawItem?.email, personal?.email, user?.email, "-");
  const phone = pickFirstValue(
    rawItem?.notelp,
    rawItem?.phone,
    rawItem?.phone_number,
    rawItem?.no_hp,
    rawItem?.nomor_hp,
    personal?.phone,
    personal?.phone_number,
    personal?.notelp,
    user?.notelp,
    user?.phone,
    profile?.notelp,
    profile?.phone,
    profile?.phone_number,
    "-",
  );
  const about = pickFirstValue(
    rawItem?.tentang_saya,
    rawItem?.biodata,
    rawItem?.bio,
    rawItem?.about_me,
    personal?.biodata,
    personal?.bio,
    personal?.about,
    profile?.tentang_saya,
    profile?.biodata,
    profile?.bio,
    profile?.about_me,
    rawItem?.about,
    profile?.about,
  );
  const photo = pickFirstValue(
    rawItem?.foto,
    rawItem?.photo,
    rawItem?.photo_url,
    rawItem?.avatar,
    rawItem?.avatar_url,
    rawItem?.profile_photo,
    personal?.foto,
    personal?.photo,
    personal?.photo_url,
    personal?.avatar,
    personal?.avatar_url,
    profile?.foto,
    profile?.photo,
    profile?.photo_url,
    profile?.avatar,
    profile?.avatar_url,
    profile?.profile_photo,
    user?.foto,
    user?.photo,
    user?.avatar,
  );
  const gender = pickFirstValue(
    rawItem?.jenis_kelamin,
    rawItem?.gender,
    rawItem?.jenisKelamin,
    personal?.gender,
    personal?.jenis_kelamin,
    profile?.jenis_kelamin,
    profile?.gender,
    "-",
  );
  const birthPlace = pickFirstValue(
    rawItem?.tempat_lahir,
    rawItem?.place_of_birth,
    rawItem?.birth_place,
    personal?.birth_place,
    personal?.place_of_birth,
    profile?.tempat_lahir,
    profile?.place_of_birth,
    profile?.birth_place,
    "-",
  );
  const birthDate = pickFirstValue(
    rawItem?.tanggal_lahir,
    rawItem?.date_of_birth,
    rawItem?.birth_date,
    personal?.birth_date,
    personal?.date_of_birth,
    profile?.tanggal_lahir,
    profile?.date_of_birth,
    profile?.birth_date,
  );
  const combinedBirthPlaceAndDate = formatBirthPlaceAndDate(birthPlace, birthDate);
  const rawBirthDisplay = pickFirstValue(
    personal?.birth,
    rawItem?.birth,
    profile?.birth,
  );
  const birthPlaceAndDate =
    birthDate && combinedBirthPlaceAndDate !== "-"
      ? combinedBirthPlaceAndDate
      : rawBirthDisplay || combinedBirthPlaceAndDate;
  const address = buildTalentAddress({
    detail_alamat: pickFirstValue(
      rawItem?.detail_alamat,
      rawItem?.alamat,
      rawItem?.alamat_domisili,
      rawItem?.address,
      rawItem?.address_detail,
      personal?.address,
      personal?.alamat,
      profile?.detail_alamat,
      profile?.alamat,
      profile?.alamat_domisili,
      profile?.address,
      profile?.address_detail,
    ),
    kabupaten: pickFirstValue(
      rawItem?.kabupaten,
      rawItem?.kota,
      rawItem?.city,
      profile?.kabupaten,
      profile?.kota,
      profile?.city,
    ),
    provinsi: pickFirstValue(
      rawItem?.provinsi,
      rawItem?.province,
      rawItem?.state,
      profile?.provinsi,
      profile?.province,
      profile?.state,
    ),
  });
  const linkedin = pickFirstValue(
    rawItem?.linkedin,
    rawItem?.linkedin_url,
    socials?.linkedin,
    socials?.linkedin_url,
    personal?.linkedin,
    personal?.linkedin_url,
    profile?.linkedin,
    profile?.linkedin_url,
  );
  const instagram = pickFirstValue(
    rawItem?.instagram,
    rawItem?.instagram_url,
    socials?.instagram,
    socials?.instagram_url,
    personal?.instagram,
    personal?.instagram_url,
    profile?.instagram,
    profile?.instagram_url,
  );
  const position = pickFirstValue(
    rawItem?.posisi,
    rawItem?.position,
    personal?.role,
    personal?.position,
    personal?.job_title,
    rawItem?.job_title,
    rawItem?.lowongan?.judul_posisi,
    rawItem?.job?.judul_posisi,
    "-",
  );
  const university = pickFirstValue(
    rawItem?.universitas,
    rawItem?.university,
    rawItem?.campus,
    academic?.university,
    academic?.universitas,
    academic?.asal_kampus,
    academic?.university,
    academic?.education?.universitas,
    academic?.education?.university,
    profile?.universitas,
    profile?.university,
    profile?.campus,
    "-",
  );
  const major = pickFirstValue(
    rawItem?.jurusan,
    rawItem?.major,
    rawItem?.program_studi,
    academic?.major,
    academic?.jurusan,
    academic?.prodi,
    academic?.major,
    academic?.education?.jurusan,
    academic?.education?.major,
    profile?.jurusan,
    profile?.major,
    profile?.program_studi,
    "-",
  );
  const ipk = pickFirstValue(
    rawItem?.ipk,
    academic?.ipk,
    academic?.ipk,
    academic?.education?.ipk,
    profile?.ipk,
  );
  const registeredAt = pickFirstValue(
    rawItem?.created_at,
    rawItem?.registered_at,
    rawItem?.tanggal_daftar,
  );
  const experiences = normalizeList(
    rawItem?.pengalaman ||
      rawItem?.experiences ||
      rawItem?.work_experiences ||
      rawItem?.workExperiences ||
      rawItem?.intern_experiences ||
      rawItem?.internExperiences ||
      academic?.experiences ||
      academic?.experience ||
      academic?.pengalaman ||
      profile?.pengalaman ||
      profile?.experiences ||
      profile?.work_experiences ||
      profile?.workExperiences ||
      profile?.intern_experiences ||
      profile?.internExperiences,
  );
  const certifications = normalizeList(
    rawItem?.sertifikasi ||
      rawItem?.certifications ||
      rawItem?.licenses ||
      rawItem?.lisensi ||
      rawItem?.intern_certifications ||
      rawItem?.internCertifications ||
      academic?.certifications ||
      academic?.certification ||
      academic?.sertifikasi ||
      profile?.sertifikasi ||
      profile?.certifications ||
      profile?.licenses ||
      profile?.lisensi ||
      profile?.intern_certifications ||
      profile?.internCertifications,
  );
  const skills = normalizeList(rawItem?.skills || profile?.skills);

  const cvUrl = pickFirstValue(
    rawItem?.cv,
    rawItem?.cv_url,
    documents?.cv,
    documents?.cv_url,
    profile?.cv,
    profile?.cv_url,
    rawItem?.cv_pdf,
    profile?.cv_pdf,
  );
  const portfolioUrl = pickFirstValue(
    rawItem?.portofolio,
    rawItem?.portfolio_url,
    documents?.portfolio,
    documents?.portfolio_url,
    profile?.portofolio_pdf,
    profile?.portfolio_url,
    rawItem?.portfolio,
  );
  const transcriptUrl = pickFirstValue(
    rawItem?.transkrip,
    rawItem?.transcript,
    rawItem?.transcript_url,
    rawItem?.transkrip_nilai_pdf,
    rawItem?.transkrip_nilai_url,
    documents?.transcript,
    documents?.transcript_url,
    profile?.transkrip_pdf,
    profile?.transkrip_nilai_pdf,
    profile?.transcript,
    profile?.transcript_url,
  );
  const educationDocumentUrl = pickFirstValue(
    rawItem?.pendidikan_document,
    rawItem?.pendidikan_document_url,
    rawItem?.dokumen_pendidikan_pdf,
    rawItem?.education_document,
    rawItem?.education_document_url,
    rawItem?.dokumen_pendidikan,
    rawItem?.dokumen_pendidikan_url,
    profile?.dokumen_pendidikan_pdf,
    profile?.pendidikan_document,
    profile?.pendidikan_document_url,
    profile?.education_document,
    profile?.education_document_url,
    academic?.education_document,
    academic?.education_document_url,
    academic?.pendidikan_document,
    academic?.pendidikan_document_url,
    academic?.education?.document,
    academic?.education?.document_url,
    academic?.education?.file,
    academic?.education?.file_url,
    academic?.education?.preview_url,
    academic?.education?.supporting_document_url,
    academic?.education?.dokumen_pendidikan_pdf,
    // CATATAN: Tidak boleh fallback ke transcriptUrl atau transkrip_nilai_pdf
    // karena itu adalah dokumen yang berbeda (transkrip nilai, bukan dokumen pendidikan)
  );
  const identityUrl = pickFirstValue(
    rawItem?.ktp,
    rawItem?.identity,
    rawItem?.identity_url,
    documents?.ktp,
    documents?.identity,
    documents?.identity_url,
    profile?.ktp_pdf,
    profile?.identity,
    profile?.identity_url,
  );
  const recommendationUrl = pickFirstValue(
    rawItem?.surat_rekomendasi,
    rawItem?.recommendation,
    rawItem?.recommendation_url,
    documents?.recommendation_letter,
    documents?.recommendation_letter_url,
    profile?.surat_rekomendasi_pdf,
    profile?.recommendation,
    profile?.recommendation_url,
  );

  const testStartedAt = pickFirstValue(
    rawItem?.test_started_at,
    rawItem?.assessment_started_at,
    profile?.test_started_at,
    profile?.assessment_started_at,
  );
  const testFinishedAt = pickFirstValue(
    rawItem?.test_finished_at,
    rawItem?.assessment_finished_at,
    profile?.test_finished_at,
    profile?.assessment_finished_at,
  );
  const assessmentScore = pickFirstValue(
    rawItem?.score,
    rawItem?.assessment_score,
    rawItem?.test_score,
    rawItem?.hasil_test,
  );
  const assessmentAnswers = normalizeList(
    rawItem?.review_jawaban ||
      rawItem?.pretest_answers ||
      rawItem?.assessment_answers ||
      rawItem?.answers ||
      rawItem?.assessment?.answers ||
      rawItem?.assessment?.pretest_answers ||
      rawItem?.assessment?.review_jawaban ||
      rawItem?.hasil_online_assessment?.answers ||
      rawItem?.test_result?.answers ||
      rawItem?.profile?.assessment?.answers ||
      rawItem?.profile?.pretest_answers ||
      profile?.review_jawaban ||
      profile?.pretest_answers,
  );
  const hasAssessment = Boolean(testFinishedAt);

  return {
    id: String(rawItem?.user_id || rawItem?.id || user?.user_id || ""),
    name,
    email,
    phone,
    photo: normalizeTalentAssetUrl(photo),
    about,
    gender,
    birthPlace,
    birthDate,
    birthPlaceAndDate,
    address,
    linkedin,
    instagram,
    position,
    university,
    major,
    ipk,
    registeredAt: formatTalentDate(registeredAt),
    status: normalizeTalentStatus(
      rawItem?.status || rawItem?.application_status || rawItem?.review_status,
    ),
    experiences: experiences.map(normalizeExperienceItem),
    certifications: certifications.map(normalizeCertificationItem),
    skills,
    educationDocument: buildTalentDocument(
      normalizeTalentAssetUrl(educationDocumentUrl),
      "Dokumen Pendidikan",
    ),
    documents: {
      cv: buildTalentDocument(
        normalizeTalentAssetUrl(cvUrl),
        "Curriculum Vitae",
      ),
      portfolio: buildTalentDocument(
        normalizeTalentAssetUrl(portfolioUrl),
        "Portfolio",
      ),
      identity: buildTalentDocument(
        normalizeTalentAssetUrl(identityUrl),
        "KTP / Identitas Diri",
      ),
      recommendation: buildTalentDocument(
        normalizeTalentAssetUrl(recommendationUrl),
        "Surat Rekomendasi",
      ),
      transcript: buildTalentDocument(
        normalizeTalentAssetUrl(transcriptUrl),
        "Transkrip Nilai",
      ),
    },
    assessment: {
      available: hasAssessment,
      subtitle: testFinishedAt
        ? `Kandidat menyelesaikan tes pada ${formatTalentDate(testFinishedAt)}`
        : testStartedAt
          ? `Tes dimulai pada ${formatTalentDate(testStartedAt)}`
          : "Belum ada hasil assessment",
      summary: hasAssessment
        ? "Peserta sudah mengerjakan pre-test dan hasilnya siap ditinjau."
        : "Peserta belum mengerjakan pre-test.",
    },
  };
}
