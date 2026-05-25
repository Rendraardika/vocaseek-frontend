import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../../components/admin/SidebarMitra";
import {
  ArrowLeft,
  Download,
  UserRound,
  GraduationCap,
  FolderOpen,
  Link as LinkIcon,
  Camera,
  ShieldCheck,
  Folder,
  FileText,
  BadgeCheck,
  User,
} from "lucide-react";
import "../../../styles/TalentDetail.css";
import { getApiErrorMessage } from "../../../services/auth";
import { mapTalentDetailPayload } from "../../../utils/talentProfile";
import { resolveCompanyCandidateDetail } from "../../../utils/companyCandidateDetail";

function InfoLabel({ title, value }) {
  return (
    <div className="detail-info-item">
      <div className="detail-info-label">{title}</div>
      <div className="detail-info-value">{value || "-"}</div>
    </div>
  );
}

function Chip({ children, blue = false }) {
  return (
    <span className={`detail-chip ${blue ? "blue" : "default"}`}>
      {children}
    </span>
  );
}

function FileItem({ document, color = "orange" }) {
  const colorClass = {
    orange: "orange",
    blue: "blue",
    green: "green",
    gray: "gray",
  };

  const { title, subtitle, available, url } = document;
  const handleOpen = () => {
    if (!available || !url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={handleOpen}
      className={`detail-file-item ${available ? "clickable" : "empty"}`}
    >
      <div className="detail-file-left">
        <div className={`detail-file-icon ${colorClass[color]}`}>
          {title.includes("Curriculum") && <FileText size={20} />}
          {title.includes("Portfolio") && <Folder size={20} />}
          {title.includes("KTP") && <BadgeCheck size={20} />}
          {title.includes("Surat") && <FileText size={20} />}
          {title.includes("Transkrip") && <GraduationCap size={20} />}
        </div>

        <div>
          <div className={`detail-file-title ${available ? "" : "empty"}`}>
            {title}
          </div>
          {subtitle ? <div className="detail-file-subtitle">{subtitle}</div> : null}
        </div>
      </div>

      <button
        type="button"
        className={`detail-file-action ${available ? "" : "empty"}`}
        onClick={(event) => {
          event.stopPropagation();
          handleOpen();
        }}
        disabled={!available}
      >
        {available ? "Lihat File" : "Kosong"}
      </button>
    </div>
  );
}

export default function DetailTalent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [talent, setTalent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadTalentDetail = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const matchedItem = await resolveCompanyCandidateDetail(id);

        if (!isMounted) return;

        if (!matchedItem) {
          setTalent(null);
          setErrorMessage("Data kandidat tidak ditemukan.");
          return;
        }

        const mappedTalent = mapTalentDetailPayload(matchedItem);

        const resolvedId = String(
          mappedTalent?.id ||
          matchedItem?.__resolvedId ||
            matchedItem?.candidate_id ||
            matchedItem?.application_id ||
            matchedItem?.user_id ||
            matchedItem?.user?.user_id ||
            matchedItem?.id ||
            id,
        );

        if (
          resolvedId &&
          String(id) !== resolvedId &&
          String(id).toUpperCase().startsWith("KDT-")
        ) {
          navigate(`/admin/mitra/talent/${resolvedId}`, { replace: true });
        }

        setTalent(mappedTalent);
      } catch (error) {
        if (!isMounted) return;
        setTalent(null);
        setErrorMessage(getApiErrorMessage(error, "Gagal memuat detail kandidat."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTalentDetail();

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  const profileImage = useMemo(() => talent?.photo || "", [talent]);
  const documents = talent?.documents || {};
  const experiences = talent?.experiences || [];
  const certifications = talent?.certifications || [];

  const openDocument = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="detail-talent-layout">
      <Sidebar />

      <main className="detail-talent-main">

        <section className="detail-talent-content">
          <div className="detail-breadcrumb">
            <span>ADMIN</span>
            <span>&rsaquo;</span>
            <span>TALENT MANAGEMENT</span>
            <span>&rsaquo;</span>
            <span className="active">DETAIL PROFIL</span>
          </div>

          <div className="detail-header">
            <div className="detail-header-left">
              <button
                onClick={() => navigate("/admin/mitra/talent/semua-kandidat")}
                className="detail-back-button"
                type="button"
              >
                <ArrowLeft size={28} />
              </button>
              <h1 className="detail-page-title">Ringkasan Profil Lengkap</h1>
            </div>

            <div className="detail-header-actions">
              <button
                type="button"
                className="detail-primary-button"
                onClick={() => {
                  if (documents.cv?.available) {
                    window.open(documents.cv.url, "_blank", "noopener,noreferrer");
                  }
                }}
                disabled={!documents.cv?.available}
              >
                <Download size={18} />
                Unduh CV
              </button>
            </div>
          </div>

          {errorMessage && (
            <div style={{ marginBottom: 16, color: "#d93025", fontWeight: 500 }}>
              {errorMessage}
            </div>
          )}

          <div className="detail-grid">
            <div className="detail-card">
              <div className="detail-card-header">
                <UserRound size={22} className="detail-card-header-icon" />
                <h2>Data Pribadi</h2>
              </div>

              <div className="detail-profile-section">
                <div className="detail-avatar-wrapper">
                  <div
                    className={`detail-avatar-frame ${profileImage ? "" : "detail-avatar-empty"}`}
                  >
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt={talent?.name || "Foto Kandidat"}
                        className="detail-avatar-image"
                      />
                    ) : (
                      <div className="detail-avatar-placeholder">
                        <User size={44} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-profile-name">
                  {isLoading ? "Memuat..." : talent?.name || "-"}
                </div>
                <div className="detail-profile-role">
                  {isLoading ? "Memuat data posisi..." : talent?.position || "-"}
                </div>
              </div>

              <div className="detail-biodata-box">
                <div className="detail-box-label">Biodata</div>
                <p>
                  {isLoading
                    ? "Memuat biodata..."
                    : talent?.about || "Belum ada biodata dari kandidat."}
                </p>
              </div>

              <div className="detail-info-list">
                <InfoLabel title="Jenis Kelamin" value={talent?.gender} />
                <InfoLabel
                  title="Tempat, Tanggal Lahir"
                  value={talent?.birthPlaceAndDate}
                />
                <InfoLabel title="Email" value={talent?.email} />
                <InfoLabel title="No Handphone" value={talent?.phone} />
                <InfoLabel title="Alamat Domisili" value={talent?.address} />
              </div>

              <div className="detail-social-section">
                <div className="detail-box-label">Social Media</div>
                <div className="detail-social-buttons">
                  <button
                    type="button"
                    className="detail-social-button"
                    disabled={!talent?.linkedin}
                    onClick={() =>
                      window.open(talent.linkedin, "_blank", "noopener,noreferrer")
                    }
                  >
                    <LinkIcon size={16} />
                    LinkedIn
                  </button>
                  <button
                    type="button"
                    className="detail-social-button"
                    disabled={!talent?.instagram}
                    onClick={() =>
                      window.open(talent.instagram, "_blank", "noopener,noreferrer")
                    }
                  >
                    <Camera size={16} />
                    Instagram
                  </button>
                </div>
              </div>
            </div>

            <div className="detail-middle-column">
              <div className="detail-card">
                <div className="detail-card-header">
                  <GraduationCap size={22} className="detail-card-header-icon" />
                  <h2>Data Akademik</h2>
                </div>

           <div className="detail-card-body">
                  <div className="detail-section-title">Pendidikan</div>
                  <div className="detail-education-row">
                    <div>
                      <div className="detail-education-title">
                        {talent?.university || "Belum ada data pendidikan"}
                      </div>
                      <div className="detail-education-subtitle">
                        {talent?.major && talent.major !== "-" ? `${talent.major}${talent.ipk ? ` • IPK ${talent.ipk}` : ""}` : "-"}
                      </div>
                      {talent?.educationDocument?.available && (
                        <button
                          type="button"
                          className="detail-file-link"
                          onClick={() => openDocument(talent.educationDocument.url)}
                        >
                          Lihat File
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="detail-section-title work">Pengalaman</div>

                  <div className="detail-timeline">
                    {experiences.length > 0 ? (
                      experiences.map((experience, index) => (
                        <div key={`experience-${index}`} className="detail-timeline-item">
                          <div className="detail-timeline-content">
                            <div className="detail-job-title">
                              {experience?.posisi || experience?.jabatan || experience?.title || "Pengalaman"}
                            </div>
                            <div className="detail-job-subtitle">
                              {experience?.subtitle || experience?.perusahaan || experience?.company || experience?.deskripsi || "-"}
                            </div>
                            {experience?.period && (
                              <div className="detail-job-subtitle">{experience.period}</div>
                            )}
                            {experience?.documentUrl && (
                              <button
                                type="button"
                                className="detail-file-link"
                                onClick={() => openDocument(experience.documentUrl)}
                              >
                                Lihat File
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="detail-timeline-item">
                        <div className="detail-timeline-content">
                          <div className="detail-job-title">Belum ada pengalaman</div>
                          <div className="detail-job-subtitle">-</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="detail-section-title work">Lisensi & Sertifikasi</div>
                  <div className="detail-certification-list">
                    {certifications.length > 0 ? (
                      certifications.map((certificate, index) => (
                        <div key={`cert-${index}`} className="detail-certification-item">
                          <Chip>
                            {certificate?.title || certificate?.nama || certificate?.sertifikasi || "Sertifikasi"}
                          </Chip>
                          {certificate?.documentUrl && (
                            <button
                              type="button"
                              className="detail-file-link"
                              onClick={() => openDocument(certificate.documentUrl)}
                            >
                              Lihat File
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <Chip>Belum ada data</Chip>
                    )}
                  </div>
                </div>
              </div>

              <div className="detail-card">
                <div className="detail-assessment-header">
                  <div className="detail-assessment-icon-box">
                    <ShieldCheck size={20} className="detail-assessment-icon" />
                  </div>
                  <div>
                    <div className="detail-assessment-title">Hasil Online Assessment</div>
                    <div className="detail-assessment-subtitle">
                      {talent?.assessment?.subtitle || "Belum ada hasil assessment"}
                    </div>
                  </div>
                </div>

                <div className="detail-assessment-box">
                  {talent?.assessment?.summary ||
                    "Belum ada hasil assessment untuk ditampilkan."}
                </div>

                {talent?.assessment?.available && (
                  <div className="detail-assessment-footer">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/admin/mitra/talent/${talent?.id || id}/assessment-review`,
                        )
                      }
                      className="detail-review-button"
                    >
                      Review Jawaban
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="detail-card">
              <div className="detail-card-header">
                <FolderOpen size={22} className="detail-card-header-icon" />
                <h2>Dokumen Pendukung</h2>
              </div>

              <p className="detail-document-description">
                Dokumen yang telah divalidasi dan diunggah oleh kandidat.
              </p>

              <FileItem
                document={
                  documents.cv || {
                    title: "Curriculum Vitae",
                    subtitle: "Belum ada file",
                    available: false,
                  }
                }
                color="orange"
              />
              <FileItem
                document={
                  documents.portfolio || {
                    title: "Portfolio",
                    subtitle: "Belum ada file",
                    available: false,
                  }
                }
                color="blue"
              />
              <FileItem
                document={
                  documents.identity || {
                    title: "KTP / Identitas Diri",
                    subtitle: "Belum ada file",
                    available: false,
                  }
                }
                color="green"
              />
              <FileItem
                document={
                  documents.recommendation || {
                    title: "Surat Rekomendasi",
                    subtitle: "Belum ada file",
                    available: false,
                  }
                }
                color="gray"
              />
              <FileItem
                document={
                  documents.transcript || {
                    title: "Transkrip Nilai",
                    subtitle: "Belum ada file",
                    available: false,
                  }
                }
                color="blue"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
