import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Soal1.css";
import { translatePhrase } from "../../i18n/phrases";
import { getApiErrorMessage } from "../../services/auth";
import { submitInternTest } from "../../services/intern";
import { getSavedLanguage } from "../../utils/languagePreference";
import {
  PRETEST_DURATION_MS,
  PRETEST_QUESTION_BANK,
  PRETEST_STORAGE_KEYS,
  getPretestQuestionText,
} from "../../utils/pretestAssessment";
import { getScopedItem, setScopedItem } from "../../utils/userScopedStorage";

function getPretestStartedAt() {
  const savedStartedAt = Number(getScopedItem(PRETEST_STORAGE_KEYS.startedAt));

  if (Number.isFinite(savedStartedAt) && savedStartedAt > 0) {
    return savedStartedAt;
  }

  const now = Date.now();
  setScopedItem(PRETEST_STORAGE_KEYS.startedAt, String(now));
  return now;
}

function getRemainingTime(startedAt) {
  return Math.max(0, PRETEST_DURATION_MS - (Date.now() - startedAt));
}

function formatRemainingTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function Soal1() {
  const navigate = useNavigate();
  const [startedAt] = useState(() => getPretestStartedAt());
  const [remainingMs, setRemainingMs] = useState(() =>
    getRemainingTime(getPretestStartedAt()),
  );
  const [answers, setAnswers] = useState(() => {
    const saved = PRETEST_STORAGE_KEYS.readAnswers();
    return saved ? JSON.parse(saved) : {};
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [language, setLanguage] = useState(() => getSavedLanguage());

  const questions = useMemo(() => PRETEST_QUESTION_BANK, []);
  const t = useCallback(
    (text) => translatePhrase(text, language === "en" ? "en" : "id") || text,
    [language],
  );

  const questionIds = useMemo(() => {
    return Object.keys(questions)
      .map(Number)
      .filter((id) => Number.isFinite(id) && questions[id])
      .sort((a, b) => a - b);
  }, [questions]);

  const [activeNo, setActiveNo] = useState(() => {
    const firstQuestionId =
      Object.keys(PRETEST_QUESTION_BANK)
        .map(Number)
        .filter((id) => Number.isFinite(id) && PRETEST_QUESTION_BANK[id])
        .sort((a, b) => a - b)[0] || 1;

    return firstQuestionId;
  });

  const activeIndex = useMemo(
    () => questionIds.indexOf(activeNo),
    [questionIds, activeNo],
  );
  const currentQuestion = questions[activeNo];
  const currentAnswer = answers[activeNo] || "";
  const currentQuestionText = getPretestQuestionText(currentQuestion, language);

  const finishTest = useCallback(async () => {
    if (isSubmitting) return;

    const unansweredQuestions = questionIds.filter(
      (questionId) => !["Ya", "Tidak"].includes(answers[questionId]),
    );

    if (unansweredQuestions.length > 0) {
      window.alert(t("Semua soal pre-test harus dijawab sebelum dikirim."));
      return;
    }

    setIsSubmitting(true);

    try {
      await submitInternTest({
        answers: questionIds.map((questionId) => ({
          question_id: questionId,
          selected_option: answers[questionId],
        })),
      });

      localStorage.removeItem("PRETEST_GLOBAL_ANSWERS");

      setScopedItem(PRETEST_STORAGE_KEYS.completed, "true");
      setScopedItem(PRETEST_STORAGE_KEYS.answers, JSON.stringify(answers));
      setScopedItem(PRETEST_STORAGE_KEYS.questions, JSON.stringify(questions));
      navigate("/selesai-test");
    } catch (error) {
      window.alert(
        getApiErrorMessage(error, t("Gagal mengirim jawaban pre-test.")),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, isSubmitting, navigate, questionIds, questions, t]);

  const timeText = formatRemainingTime(remainingMs);

  useEffect(() => {
    setScopedItem(PRETEST_STORAGE_KEYS.answers, JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    setScopedItem(PRETEST_STORAGE_KEYS.questions, JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    if (questionIds.length === 0) return;

    if (!questionIds.includes(activeNo)) {
      setActiveNo(questionIds[0]);
    }
  }, [questionIds, activeNo]);

  useEffect(() => {
    const syncLanguage = () => {
      setLanguage(getSavedLanguage());
    };

    window.addEventListener("language-changed", syncLanguage);
    window.addEventListener("storage", syncLanguage);

    return () => {
      window.removeEventListener("language-changed", syncLanguage);
      window.removeEventListener("storage", syncLanguage);
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      const nextRemainingMs = getRemainingTime(startedAt);
      setRemainingMs(nextRemainingMs);

      if (nextRemainingMs <= 0) {
        finishTest();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [finishTest, startedAt]);

  const getNextUnansweredQuestionId = (fromIndex) => {
    for (let i = fromIndex + 1; i < questionIds.length; i += 1) {
      const questionId = questionIds[i];
      if (!["Ya", "Tidak"].includes(answers[questionId])) {
        return questionId;
      }
    }
    return null;
  };

  const handlePickNumber = (questionId) => {
    setActiveNo(questionId);
  };

  const handleAnswer = (value) => {
    setAnswers((prev) => ({
      ...prev,
      [activeNo]: value,
    }));
  };

  const handleNext = () => {
    const nextQuestionId = getNextUnansweredQuestionId(activeIndex);

    if (nextQuestionId !== null) {
      setActiveNo(nextQuestionId);
      return;
    }

    finishTest();
  };

  const hasNextUnanswered = getNextUnansweredQuestionId(activeIndex) !== null;
  const isAnsweredCurrent = ["Ya", "Tidak"].includes(currentAnswer);

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="assessPage">
      <header className="assessHeader">
        <div className="assessHeaderInner">
          <div className="assessLogo">
            <img
              src="/vocaseeklogo.png"
              alt="Vocaseek"
              className="assessLogoImg"
            />
          </div>

          <div className="assessHeaderRight">
            <div className="assessTimer" role="status" aria-label="Timer">
              <span className="assessTimerDot" aria-hidden="true" />
              <span className="assessTimerText">{timeText}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="assessBody">
        <aside className="assessAside" aria-label={t("Navigasi Soal")}>
          <div className="assessAsideInner">
            <div className="assessAsideLabel">{t("KATEGORI SOAL")}</div>
            <div className="assessAsideTitle">
              Cognitive &amp; Problem Solving
            </div>

            <div className="assessAsideDivider" />

            <div className="assessNumGrid">
              {questionIds.map((questionId, index) => {
                const isActiveBtn = questionId === activeNo;
                const isAnswered = ["Ya", "Tidak"].includes(
                  answers[questionId],
                );

                return (
                  <button
                    key={questionId}
                    type="button"
                    className={`assessNumBtn ${isAnswered ? "isAnswered" : ""} ${isActiveBtn ? "isActive" : ""}`}
                    onClick={() => handlePickNumber(questionId)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="assessAsideFooter">
              {language === "en"
                ? "© 2026 Vocaseek Education. All rights reserved."
                : "© 2026 Vocaseek Education. Seluruh hak cipta dilindungi."}
            </div>
          </div>
        </aside>

        <main className="assessMain">
          <div className="assessMainInner">
            <div className="assessQuestionWrap">
              <h1 className="assessQuestion">{currentQuestionText}</h1>
            </div>

            <div className="assessAnswerGrid">
              <button
                type="button"
                className={`answerCard ${currentAnswer === "Ya" ? "selected" : ""}`}
                onClick={() => handleAnswer("Ya")}
              >
                <div className="answerIcon yesIcon" aria-hidden="true">
                  ✓
                </div>
                <div className="answerTitle">{t("Iya")}</div>
                <div className="answerDesc">{t("Saya setuju pernyataan")}</div>
              </button>

              <button
                type="button"
                className={`answerCard ${currentAnswer === "Tidak" ? "selected" : ""}`}
                onClick={() => handleAnswer("Tidak")}
              >
                <div className="answerIcon noIcon" aria-hidden="true">
                  ✕
                </div>
                <div className="answerTitle">{t("Tidak")}</div>
                <div className="answerDesc">{t("Tidak Setuju")}</div>
              </button>
            </div>

            <div className="assessBottomBar">
              <button
                className="assessNextBtn"
                type="button"
                onClick={handleNext}
                disabled={isSubmitting || !isAnsweredCurrent}
              >
                {hasNextUnanswered ? t("Selanjutnya") : t("Selesai")}{" "}
                <span>›</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
