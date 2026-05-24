import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../styles/ProfilLayout.css";
import "../../styles/Histori.css";
import { logoutUser } from "../../services/auth";
import { clearAuthSession } from "../../utils/authStorage";
import { readProfileFromStorage } from "../../components/user/ProfileStorage";
import {
  getScopedItem,
  removeScopedItem,
  setScopedItem,
  USER_STORAGE_KEYS,
} from "../../utils/userScopedStorage";
import {
  extractApplicationCollection,
  mapAppliedJobFromApplication,
} from "../../utils/applicationStatus";
import {
  getInternApplications,
  withdrawInternApplication,
} from "../../services/intern";

const defaultProfile = {
  photo: "",
  fullName: "",
  email: "",
};

const defaultAppliedJob = {
  id: "",
  title: "Belum ada lowongan dipilih",
  company: "Perusahaan belum tersedia",
  location: "Lokasi belum tersedia",
  type: "MAGANG",
  duration: "",
  work: "",
  stage: "Pending",
  rawStatus: "PENDING",
};

export default function Histori() {
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTimerRef = useRef(null);
  const isStatusLamaranGroup =
    location.pathname.startsWith("/status-lamaran") ||
    location.pathname.startsWith("/histori-lamaran");

  const readSavedProfile = () => {
    const profile = readProfileFromStorage();
    return {
      photo: profile.photo || "",
      fullName: profile.fullName || "",
      email: profile.email || "",
    };
  };

  const readAppliedJob = () => {
    try {
      const savedJob = getScopedItem(USER_STORAGE_KEYS.appliedJob);
      if (!savedJob) return defaultAppliedJob;

      const parsed = JSON.parse(savedJob);
      return {
        id: parsed?.id || "",
        title: parsed?.title || "Belum ada lowongan dipilih",
        company: parsed?.company || "Perusahaan belum tersedia",
        location: parsed?.location || "Lokasi belum tersedia",
        type: parsed?.type || "MAGANG",
        duration: parsed?.duration || "",
        work: parsed?.work || "",
        stage: parsed?.stage || "Pending",
        rawStatus: parsed?.rawStatus || "PENDING",
      };
    } catch (error) {
      console.error("Gagal membaca data lowongan dari localStorage:", error);
      return defaultAppliedJob;
    }
  };

  const [savedProfile, setSavedProfile] = useState(defaultProfile);
  const [appliedJob, setAppliedJob] = useState(defaultAppliedJob);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const syncAppliedJobFromSources = useCallback(async () => {
    const localAppliedJob = readAppliedJob();

    try {
      const response = await getInternApplications();
      const applications = extractApplicationCollection(response?.data);
      const latestApplication = applications[0];

      if (latestApplication) {
        setAppliedJob(
          mapAppliedJobFromApplication(latestApplication, localAppliedJob || {}),
        );
        return;
      }
    } catch (error) {
      console.error("Gagal membaca status lamaran dari backend:", error);
    }

    setAppliedJob(localAppliedJob);
  }, []);

  useEffect(() => {
    setScopedItem(USER_STORAGE_KEYS.statusViewed, "true");
    window.dispatchEvent(new Event("career-journey-updated"));
  }, [syncAppliedJobFromSources]);

  useEffect(() => {
    const syncAllData = () => {
      setSavedProfile(readSavedProfile());
      syncAppliedJobFromSources();
    };

    syncAllData();

    window.addEventListener("profile-updated", syncAllData);
    window.addEventListener("storage", syncAllData);

    return () => {
      window.removeEventListener("profile-updated", syncAllData);
      window.removeEventListener("storage", syncAllData);

      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, [syncAppliedJobFromSources]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout backend gagal, sesi lokal tetap dibersihkan:", error);
    } finally {
      clearAuthSession();
      navigate("/login");
    }
  };

  const openWithdrawModal = () => {
    setShowWithdrawModal(true);
  };

  const closeWithdrawModal = () => {
    setShowWithdrawModal(false);
  };

  const handleConfirmWithdraw = async () => {
    if (!appliedJob.id) {
      setShowWithdrawModal(false);
      alert("Data lamaran belum sinkron. Coba refresh halaman lalu ulangi pengunduran diri.");
      return;
    }

    try {
      await withdrawInternApplication(appliedJob.id);
    } catch (error) {
      console.error("Gagal memproses pengunduran diri di backend:", error);
      setShowWithdrawModal(false);
      alert("Pengunduran diri belum berhasil diproses. Coba refresh lalu ulangi.");
      return;
    }

    setShowWithdrawModal(false);
    setShowSuccessToast(true);

    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
    }

    redirectTimerRef.current = setTimeout(() => {
      removeScopedItem(USER_STORAGE_KEYS.appliedJob);
      navigate("/status-lamaran", { replace: true });
    }, 800);
  };

  const displayName = useMemo(() => {
    return savedProfile.fullName?.trim() || "";
  }, [savedProfile.fullName]);

  const displayEmail = useMemo(() => {
    return savedProfile.email?.trim() || "";
  }, [savedProfile.email]);

  const shortEmail = useMemo(() => {
    if (!displayEmail) return "";
    return displayEmail.length > 18
      ? `${displayEmail.slice(0, 18)}...`
      : displayEmail;
  }, [displayEmail]);

  const currentStage = appliedJob.stage || "Pending";
  const isWithdrawn = currentStage === "Mengundurkan Diri";
  const isAccepted = currentStage === "Diterima";
  const isRejected = currentStage === "Ditolak";

  const steps = [
    {
      no: 1,
      title: "Pending",
      active: currentStage === "Pending",
      content:
        "Lamaran Anda sedang dalam proses peninjauan oleh perusahaan.Cek website secara berkala untuk melihat pembaruan",
    },
    {
      no: 2,
      title: "Diterima",
      active: currentStage === "Diterima",
      content:
        "Selamat, kamu sudah diterima oleh perusahaan untuk lowongan ini.",
    },
    {
      no: 3,
      title: "Ditolak",
      active: currentStage === "Ditolak",
      content:
        "Lamaran ini belum berhasil. Kamu masih bisa melamar lowongan lain yang tersedia.",
    },
  ];

  return (
    <div className="profilePage historiPage">
      <header className="profileHeader">
        <div className="headerContainer">
          <div className="headerLeft">
            <div className="logoWrap">
              <img
                src="/vocaseeklogo.png"
                alt="logo vocaseek"
                className="logoImage"
              />
            </div>
          </div>

          <div className="headerRight">
            <button className="userPill" type="button">
              {savedProfile.photo ? (
                <img
                  src={savedProfile.photo}
                  alt="Foto Profil"
                  className="userAvatarImage"
                />
              ) : (
                <span className="userAvatar" aria-hidden="true" />
              )}

              <span className="userName">{displayName || "User"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="pageContainer">
        <aside className="aside">
          <div className="asideInner">
            <div className="asideCard">
              <div className="asideOverlay" aria-hidden="true" />
              <div className="asideCardRow">
                <div className="asideAvatarWrap">
                  {savedProfile.photo ? (
                    <img
                      src={savedProfile.photo}
                      alt="Foto Profil"
                      className="asideAvatarImage"
                    />
                  ) : (
                    <div className="asideAvatar" aria-hidden="true" />
                  )}

                  <div className="asideOnlineDot" aria-hidden="true" />
                </div>

                <div className="asideMeta">
                  <div className="asideName">
                    {displayName || "Nama Pengguna"}
                  </div>
                  <div className="asideEmail">
                    {shortEmail || "email@domain.com"}
                  </div>
                </div>
              </div>
            </div>

            <nav className="asideNav" aria-label="Sidebar Navigation">
              <NavLink
                to="/profil"
                end={false}
                className={({ isActive }) =>
                  `asideLink ${isActive ? "isActive" : ""}`
                }
              >
                <span className="asideIcon" aria-hidden="true">
                  <img src="/CV.png" alt="CV" className="asideIconImg" />
                </span>
                <span className="asideLabel">Curriculum Vitae</span>
              </NavLink>

              <NavLink
                to="/status-lamaran"
                className={() =>
                  `asideLink ${isStatusLamaranGroup ? "isActive" : ""}`
                }
              >
                <span className="asideIcon" aria-hidden="true">
                  <img
                    src="/StatusLamaran.png"
                    alt="Status Lamaran"
                    className="asideIconImg"
                  />
                </span>
                <span className="asideLabel">Status Lamaran</span>
              </NavLink>

              <NavLink
                to="/pretest"
                className={({ isActive }) =>
                  `asideLink ${isActive ? "isActive" : ""}`
                }
              >
                <span className="asideIcon" aria-hidden="true">
                  <img
                    src="/Pretest.png"
                    alt="Pre-Test"
                    className="asideIconImg"
                  />
                </span>
                <span className="asideLabel">Pre-Test</span>
              </NavLink>

              <NavLink
                to="/home"
                className={({ isActive }) =>
                  `asideLink ${isActive ? "isActive" : ""}`
                }
              >
                <span className="asideIcon" aria-hidden="true">
                  <img src="/home.png" alt="home" className="asideIconImg" />
                </span>
                <span className="asideLabel">Beranda</span>
              </NavLink>

              <div className="asideDivider" />

              <button
                type="button"
                className="asideLink"
                onClick={handleLogout}
              >
                <span className="asideIcon" aria-hidden="true">
                  <img
                    src="/Keluar.png"
                    alt="Keluar"
                    className="asideIconImg"
                  />
                </span>
                <span className="asideLabel">Keluar</span>
              </button>
            </nav>
          </div>
        </aside>

        <main className="main">
          <div className="mainCard historiMainCard">
            <div className="historiHeaderRow">
              <div className="historiHeaderText">
                <h1 className="historiTitle">Status Lamaran</h1>
                <p className="historiSubtitle">
                  Pantau semua aktivitas lamaran Anda dan cek perkembangan
                  terbaru dari lowongan yang sudah Anda daftar.
                </p>
              </div>
            </div>

            <div className="historiFilterRow">
              <button className="historiFilterChip isActive" type="button">
                Semua
              </button>
            </div>

            <div className="historiContentWrap">
              <div className="historiJobCard">
                <div className="historiJobLeft">
                  <div className="historiCompanyIcon" aria-hidden="true">
                    <div className="historiBuilding">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>

                  <div className="historiJobMeta">
                    <h2 className="historiJobTitle">{appliedJob.title}</h2>
                    <p className="historiCompanyLine">
                      {appliedJob.company} • {appliedJob.location}
                      <span className="historiBadge">
                        {appliedJob.type || "MAGANG"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="historiStageWrap">
                  <button
                    className={`historiStagePill ${
                      isWithdrawn ? "isWithdrawn" : ""
                    }`}
                    type="button"
                  >
                    {currentStage}
                  </button>
                </div>
              </div>

              {isWithdrawn ? (
                <div className="historiWithdrawStateBox">
                  <div className="historiWithdrawStateIcon">!</div>
                  <div className="historiWithdrawStateText">
                    <h3>Lamaran telah diundurkan</h3>
                    <p>
                      Anda telah mengundurkan diri dari lowongan ini. Silakan
                      kembali ke halaman status lamaran untuk melihat informasi
                      terbaru.
                    </p>
                  </div>
                </div>
              ) : isAccepted ? (
                <div className="historiInfoBox">
                  <span className="historiInfoIcon" aria-hidden="true">
                    ✓
                  </span>
                  <p>
                    Selamat, lamaran kamu sudah <strong>diterima</strong>. Anda akan dihubungi via email.
                  </p>
                </div>
              ) : isRejected ? (
                <div className="historiInfoBox">
                  <span className="historiInfoIcon" aria-hidden="true">
                    !
                  </span>
                  <p>
                    Status lamaran kamu saat ini <strong>ditolak</strong>. Kamu masih bisa mencari dan melamar lowongan lain.
                  </p>
                </div>
              ) : (
                <div className="historiTimeline">
                  {steps.map((step, index) => (
                    <div
                      className={`historiStep ${step.active ? "isActive" : ""} ${
                        index === steps.length - 1 ? "isLast" : ""
                      }`}
                      key={step.no}
                    >
                      <div className="historiStepMarkerWrap">
                        <div className="historiStepMarker">{step.no}</div>
                        {index !== steps.length - 1 && (
                          <div className="historiStepLine" aria-hidden="true" />
                        )}
                      </div>

                      <div className="historiStepContent">
                        <h3 className="historiStepTitle">{step.title}</h3>

                        {step.active && (
                          <>
                            <div className="historiInfoBox">
                              <span
                                className="historiInfoIcon"
                                aria-hidden="true"
                              >
                                i
                              </span>
                              <p>{step.content}</p>
                            </div>

                            <div className="historiActionRow">
                              <button
                                className="historiWithdrawBtn"
                                type="button"
                                onClick={openWithdrawModal}
                              >
                                Pengunduran diri
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {showWithdrawModal && (
        <div className="historiModalOverlay" onClick={closeWithdrawModal}>
          <div
            className="historiModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="historiModalIcon">!</div>

            <h3 className="historiModalTitle">Konfirmasi Pengunduran Diri</h3>

            <p className="historiModalText">
              Apakah Anda yakin ingin mengundurkan diri dari lowongan
              <strong> {appliedJob.title}</strong> di
              <strong> {appliedJob.company}</strong>?
            </p>

            <div className="historiModalActions">
              <button
                type="button"
                className="historiModalCancelBtn"
                onClick={closeWithdrawModal}
              >
                Tidak
              </button>

              <button
                type="button"
                className="historiModalConfirmBtn"
                onClick={handleConfirmWithdraw}
              >
                Iya, lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessToast && (
        <div className="historiToastWrap">
          <div className="historiToastCard">
            <div className="historiToastIcon">✓</div>
            <div className="historiToastContent">
              <h4>Berhasil</h4>
              <p>
                Pengunduran diri lamaran <strong>{appliedJob.title}</strong>{" "}
                berhasil diproses.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
