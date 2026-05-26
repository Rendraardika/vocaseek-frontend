import "../../../styles/admin/AssessmentReview.css";
import { PRETEST_QUESTION_BANK } from "../../../utils/pretestAssessment";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardCheck,
  ChevronDown,
  Check,
  User,
} from "lucide-react";
import Sidebar from "../../../components/admin/Sidebar";
import SidebarStaff from "../../../components/admin/SidebarStaff";
import SidebarMitra from "../../../components/admin/SidebarMitra";
import { getAdminTalent } from "../../../services/admin";
import { getApiErrorMessage } from "../../../services/auth";
import {
  mapTalentDetailPayload,
  normalizeList,
  pickFirstValue,
} from "../../../utils/talentProfile";
import { resolveCompanyCandidateDetail } from "../../../utils/companyCandidateDetail";

function getPretestStorageKeys(talentId) {
  return [
    `PRETEST_GLOBAL_ANSWERS_${talentId}`,
    `PRETEST_ANSWERS_${talentId}`,
    `pretest_answers_${talentId}`,
  ];
}

function normalizeOption(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "iya" || normalized === "ya") return "iya";
  if (normalized === "tidak") return "tidak";

  return "belum dijawab";
}

function normalizeAnswerValue(value) {
  const normalized = normalizeOption(value);

  if (normalized === "iya") return "Iya";
  if (normalized === "tidak") return "Tidak";

  return "Belum dijawab";
}

function getOtherOption(answer) {
  if (answer === "Iya") return "Tidak";
  if (answer === "Tidak") return "Iya";
  return "-";
}

function getPretestCategory(score) {
  if (score >= 17) return "Sangat Baik";
  if (score >= 13) return "Baik";
  if (score >= 9) return "Cukup";
  if (score >= 5) return "Kurang";
  return "Tidak Siap";
}

function getCategorySummary(category) {
  if (category === "Sangat Baik") {
    return "Kandidat menunjukkan kesiapan kerja yang sangat baik. Respons yang diberikan menggambarkan perilaku kerja yang konsisten, proaktif, bertanggung jawab, mampu bekerja sama, serta cukup kuat dalam menghadapi tuntutan dan dinamika pekerjaan.";
  }

  if (category === "Baik") {
    return "Kandidat menunjukkan kesiapan kerja yang baik. Secara umum kandidat cukup konsisten dalam tanggung jawab, kerja sama, komunikasi, dan inisiatif, namun masih terdapat beberapa area pengembangan ringan agar adaptasi dan ketahanan kerja semakin optimal.";
  }

  if (category === "Cukup") {
    return "Kandidat menunjukkan potensi dasar dalam kesiapan kerja. Beberapa perilaku positif sudah terlihat, namun kandidat masih membutuhkan pembinaan pada aspek tanggung jawab, komunikasi, inisiatif, adaptasi, atau ketahanan dalam menyelesaikan pekerjaan.";
  }

  if (category === "Kurang") {
    return "Kandidat masih membutuhkan pendampingan dan penguatan kesiapan kerja. Respons yang diberikan menunjukkan perlunya peningkatan pada beberapa aspek perilaku kerja seperti tanggung jawab, kerja sama, komunikasi, inisiatif, dan konsistensi dalam menjalankan tugas.";
  }

  return "Kandidat belum menunjukkan kesiapan perilaku kerja yang memadai untuk konteks intern. Diperlukan pembinaan lebih lanjut terkait tanggung jawab, adaptasi, komunikasi, kerja sama, inisiatif, dan ketahanan dalam menghadapi pekerjaan.";
}

function getQuestionText(questionId, fallback = "") {
  const number = Number(questionId);
  const questionData = PRETEST_QUESTION_BANK?.[number];

  return (
    questionData?.titleId ||
    questionData?.titleEn ||
    fallback ||
    `Pertanyaan ${number}`
  );
}

function readScopedPretestAnswers(talentId) {
  if (!talentId) return [];

  for (const key of getPretestStorageKeys(talentId)) {
    const stored = localStorage.getItem(key);

    if (!stored) continue;

    try {
      const parsed = JSON.parse(stored);

      return Array.isArray(parsed)
        ? parsed
        : Object.entries(parsed).map(([questionId, value]) => ({
            question_id: Number(questionId),
            selected_option: value,
          }));
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeAnswerSource(value) {
  const normalized = normalizeList(value);

  if (
    normalized.length === 1 &&
    normalized[0] &&
    typeof normalized[0] === "object" &&
    !Array.isArray(normalized[0])
  ) {
    const answerMap = normalized[0];
    const looksLikeAnswerMap = Object.keys(answerMap).some((key) =>
      /^\d+$/.test(String(key)),
    );

    if (looksLikeAnswerMap) {
      return Object.entries(answerMap).map(([questionId, answer]) => ({
        question_id: Number(questionId),
        ...(answer && typeof answer === "object"
          ? answer
          : { selected_option: answer }),
      }));
    }
  }

  return normalized;
}

function buildReviewAnswers(rawTalent = {}, talentId = "") {
  let answersSource = normalizeAnswerSource(
    rawTalent?.review_jawaban ||
      rawTalent?.pretest_answers ||
      rawTalent?.assessment_answers ||
      rawTalent?.answers ||
      rawTalent?.assessment?.answers ||
      rawTalent?.assessment?.pretest_answers ||
      rawTalent?.assessment?.review_jawaban ||
      rawTalent?.hasil_online_assessment?.answers ||
      rawTalent?.test_result?.answers ||
      rawTalent?.profile?.assessment?.answers ||
      rawTalent?.profile?.pretest_answers,
  );

  if (answersSource.length === 0) {
    answersSource = readScopedPretestAnswers(talentId);
  }

  return answersSource
    .map((item, index) => {
      const number = Number(
        item?.nomor || item?.no || item?.question_id || index + 1,
      );

      const fallbackQuestion = pickFirstValue(
        item?.question,
        item?.question_text,
        item?.pertanyaan,
        `Pertanyaan ${number}`,
      );

      const selected = normalizeAnswerValue(
        pickFirstValue(
          item?.answer,
          item?.user_answer,
          item?.selected,
          item?.pilihan,
          item?.selected_option,
        ),
      );

      return {
        id: item?.id || number,
        number,
        question: getQuestionText(number, fallbackQuestion),
        selected,
        other: getOtherOption(selected),
        isAnswered: selected === "Iya" || selected === "Tidak",
      };
    })
    .filter((item) => item.isAnswered)
    .sort((first, second) => first.number - second.number);
}

function buildSummary(reviewList) {
  const totalQuestions = 20;
  const answeredCount = reviewList.filter((item) => item.isAnswered).length;
  const yesCount = reviewList.filter((item) => item.selected === "Iya").length;
  const noCount = reviewList.filter((item) => item.selected === "Tidak").length;

  const totalScore = reviewList.reduce((sum, item) => {
    const normalized = normalizeOption(item.selected);
    return sum + (normalized === "iya" ? 1 : 0);
  }, 0);

  const category = getPretestCategory(totalScore);

  return {
    totalQuestions,
    answeredCount,
    yesCount,
    noCount,
    totalScore,
    category,
    subtitle:
      answeredCount > 0 ? `Skor ${totalScore}/${totalQuestions} • ${category}` : "",
    summaryText: answeredCount > 0 ? getCategorySummary(category) : "",
  };
}

function QuestionCard({
  number,
  question,
  selected = "Belum dijawab",
  other = "-",
  isAnswered = false,
}) {
  return (
    <div className="assessment-review__question-card">
      <div className="assessment-review__question-row">
        <div className="assessment-review__question-number">{number}</div>

        <div className="assessment-review__question-content">
          <h3 className="assessment-review__question-title">{question}</h3>

          <div className="assessment-review__answer-grid">
            <div
              className={`assessment-review__answer-box ${
                isAnswered
                  ? "assessment-review__answer-box--selected"
                  : "assessment-review__answer-box--empty"
              }`}
            >
              <div className="assessment-review__answer-label">
                Pilihan Terpilih
              </div>

              <div className="assessment-review__answer-value">{selected}</div>

              {isAnswered ? (
                <div className="assessment-review__answer-check">
                  <Check
                    size={16}
                    className="assessment-review__answer-check-icon"
                    strokeWidth={3}
                  />
                </div>
              ) : null}
            </div>

            <div className="assessment-review__answer-box assessment-review__answer-box--other">
              <div className="assessment-review__answer-label assessment-review__answer-label--muted">
                Opsi Lainnya
              </div>

              <div className="assessment-review__answer-value assessment-review__answer-value--muted">
                {other}
              </div>
            </div>
          </div>

          <div className="assessment-review__question-divider" />
        </div>
      </div>
    </div>
  );
}

export default function AssessmentReviewAdmin({ mode = "super" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [talent, setTalent] = useState(null);
  const [reviewList, setReviewList] = useState([]);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTalentAssessment = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        let rawTalent = {};

        if (mode === "company") {
          rawTalent = (await resolveCompanyCandidateDetail(id)) || {};
        } else {
          const response = await getAdminTalent(id);
          rawTalent = response?.data?.data || response?.data || {};
        }

        if (!isMounted) return;

        setTalent(mapTalentDetailPayload(rawTalent));
        setReviewList(buildReviewAnswers(rawTalent, id));
      } catch (error) {
        if (!isMounted) return;

        setTalent(null);
        setReviewList([]);
        setErrorMessage(
          getApiErrorMessage(error, "Gagal memuat review jawaban kandidat."),
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTalentAssessment();

    return () => {
      isMounted = false;
    };
  }, [id, mode]);

  const summary = useMemo(() => buildSummary(reviewList), [reviewList]);
  const visibleQuestions = showAllQuestions
    ? reviewList
    : reviewList.slice(0, 4);

  const remainingQuestions = Math.max(
    reviewList.length - visibleQuestions.length,
    0,
  );

  const candidateName = talent?.name || "Kandidat Vocaseek";
  const candidateRole =
    talent?.position && String(talent.position).trim().length > 2
      ? talent.position
      : "Hasil review assessment kandidat";

  const backPath =
    mode === "staff"
      ? `/admin/staff/talent/${id}`
      : mode === "company"
        ? `/admin/mitra/talent/${id}`
        : `/admin/talent/${id}`;

  const SidebarComponent =
    mode === "staff"
      ? SidebarStaff
      : mode === "company"
        ? SidebarMitra
        : Sidebar;

  return (
    <div className="assessment-review">
      <SidebarComponent />

      <main className="assessment-review__main">
        <section className="assessment-review__section">
          <div className="assessment-review__breadcrumb">
            <span className="assessment-review__breadcrumb-muted">ADMIN</span>
            <span className="assessment-review__breadcrumb-muted">›</span>
            <span className="assessment-review__breadcrumb-muted">
              TALENT MANAGEMENT
            </span>
            <span className="assessment-review__breadcrumb-muted">›</span>
            <span className="assessment-review__breadcrumb-muted">
              DETAIL PROFIL
            </span>
            <span className="assessment-review__breadcrumb-muted">›</span>
            <span className="assessment-review__breadcrumb-active">
              ASSESSMENT REVIEW
            </span>
          </div>

          <div className="assessment-review__header">
            <button
              onClick={() => navigate(backPath)}
              className="assessment-review__back-btn"
              type="button"
            >
              <ArrowLeft size={24} />
            </button>

            <h1 className="assessment-review__title">
              Assessment Character Profile
            </h1>
          </div>

          {errorMessage && (
            <div style={{ marginBottom: 16, color: "#d93025", fontWeight: 500 }}>
              {errorMessage}
            </div>
          )}

          <div className="assessment-review__grid">
            <div className="assessment-review__summary-card">
              <div className="assessment-review__profile-wrap">
                <div className="assessment-review__avatar-wrap">
                  <div className="assessment-review__avatar">
                    {talent?.photo ? (
                      <img
                        src={talent.photo}
                        alt={candidateName}
                        className="assessment-review__avatar-image"
                      />
                    ) : (
                      <div className="assessment-review__avatar-fallback">
                        <User size={34} />
                      </div>
                    )}
                  </div>

                  <div className="assessment-review__avatar-status" />
                </div>

                <div className="assessment-review__profile-text">
                  <div className="assessment-review__profile-name">
                    {candidateName}
                  </div>
                  <div className="assessment-review__profile-role">
                    {candidateRole}
                  </div>
                </div>
              </div>

              <div className="assessment-review__stats-grid">
                <div className="assessment-review__stat-box">
                  <span className="assessment-review__stat-label">
                    Total Terjawab
                  </span>
                  <strong className="assessment-review__stat-value">
                    {summary.answeredCount}/{summary.totalQuestions}
                  </strong>
                </div>

                <div className="assessment-review__stat-box">
                  <span className="assessment-review__stat-label">
                    Memilih Iya
                  </span>
                  <strong className="assessment-review__stat-value">
                    {summary.yesCount}
                  </strong>
                </div>

                <div className="assessment-review__stat-box">
                  <span className="assessment-review__stat-label">
                    Memilih Tidak
                  </span>
                  <strong className="assessment-review__stat-value">
                    {summary.noCount}
                  </strong>
                </div>
              </div>

              <div className="assessment-review__summary-section">
                <div className="assessment-review__summary-label">
                  Ringkasan Karakter
                </div>

                <div className="assessment-review__summary-box">
                  {isLoading ? (
                    <p className="assessment-review__summary-text">
                      Memuat ringkasan assessment...
                    </p>
                  ) : summary.answeredCount > 0 ? (
                    <>
                      <p className="assessment-review__summary-text">
                        {summary.subtitle}
                      </p>
                      <p className="assessment-review__summary-text">
                        {summary.summaryText}
                      </p>
                    </>
                  ) : (
                    <p className="assessment-review__summary-text">
                      Belum ada hasil pre-test untuk kandidat ini.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="assessment-review__content-card">
              <div className="assessment-review__content-header">
                <div className="assessment-review__content-icon-box">
                  <ClipboardCheck
                    size={24}
                    className="assessment-review__content-icon"
                  />
                </div>

                <div>
                  <h2 className="assessment-review__content-title">
                    Review Jawaban
                  </h2>
                  <p className="assessment-review__content-subtitle">
                    Detail tanggapan yang diambil langsung dari hasil pre-test
                    kandidat
                  </p>
                </div>
              </div>

              {reviewList.length > 0 ? (
                <>
                  <div className="assessment-review__question-list">
                    {visibleQuestions.map((item) => (
                      <QuestionCard
                        key={item.id}
                        number={item.number}
                        question={item.question}
                        selected={item.selected}
                        other={item.other}
                        isAnswered={item.isAnswered}
                      />
                    ))}
                  </div>

                  {!showAllQuestions && remainingQuestions > 0 ? (
                    <div className="assessment-review__load-more-wrap">
                      <button
                        onClick={() => setShowAllQuestions(true)}
                        className="assessment-review__load-more-btn"
                        type="button"
                      >
                        {`Load ${remainingQuestions} More Questions`}
                        <ChevronDown size={18} />
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="assessment-review__empty-state">
                  {isLoading
                    ? "Memuat jawaban pre-test..."
                    : "Belum ada jawaban pre-test yang tersimpan dari kandidat."}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
