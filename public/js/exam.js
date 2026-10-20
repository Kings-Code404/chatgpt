/* ================================================================
   Smart Learning Web App – Online Exam Engine
   Client-side timer, question navigator, auto-save, submission
   ================================================================ */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const timerDisplay  = document.getElementById('examTimer');
  const examForm      = document.getElementById('examForm');
  const attemptId     = examForm?.dataset.attemptId;
  let remainingSeconds = parseInt(timerDisplay?.dataset.remaining || '0', 10);
  let timerInterval   = null;
  let hasSubmitted    = false;

  // Format seconds to mm:ss or hh:mm:ss
  function formatTime(totalSec) {
    const hrs  = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad  = n => String(n).padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  // Update timer display
  function updateTimer() {
    if (!timerDisplay) return;

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerDisplay.textContent = '00:00';
      timerDisplay.classList.add('danger');
      autoSubmitExam();
      return;
    }

    timerDisplay.textContent = formatTime(remainingSeconds);

    if (remainingSeconds <= 300) { // 5 minutes
      timerDisplay.classList.add('warning');
    }
    if (remainingSeconds <= 60) {  // 1 minute
      timerDisplay.classList.remove('warning');
      timerDisplay.classList.add('danger');
    }

    remainingSeconds--;
  }

  // Auto-submit when time expires
  function autoSubmitExam() {
    if (hasSubmitted) return;
    hasSubmitted = true;
    
    // Create non-blocking notification banner on top
    const banner = document.createElement('div');
    banner.className = 'alert alert-danger fixed-top m-3 shadow-lg text-center fw-bold';
    banner.style.zIndex = '99999';
    banner.textContent = '⏳ Time has expired! Automatically submitting your examination...';
    document.body.appendChild(banner);

    setTimeout(() => {
      examForm?.submit();
    }, 600);
  }

  // Initialize countdown
  if (timerDisplay && remainingSeconds > 0) {
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
  }

  // Update question button status
  function updateQuestionNav() {
    document.querySelectorAll('.question-block').forEach((qBlock, idx) => {
      const qId = qBlock.dataset.questionId;
      const navBtn = document.querySelector(`.q-nav-btn[data-question-index="${idx + 1}"]`);
      if (!navBtn) return;

      const radios = qBlock.querySelectorAll('input[type="radio"]:checked');
      const textVal = qBlock.querySelector('textarea')?.value.trim();

      if (radios.length > 0 || (textVal && textVal.length > 0)) {
        navBtn.classList.add('answered');
      } else {
        navBtn.classList.remove('answered');
      }
    });
  }

  // Auto-save answer to server via AJAX
  async function autoSaveAnswer(questionId, selectedOption, textAnswer) {
    if (!attemptId) return;
    try {
      await fetch(`/student/attempts/${attemptId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
        },
        body: JSON.stringify({ questionId, selectedOption, textAnswer })
      });
    } catch (_) {
      // Fail silently; full state will be sent upon form submit
    }
  }

  // Listen for changes in form inputs
  examForm?.addEventListener('change', (e) => {
    const target = e.target;
    const qBlock = target.closest('.question-block');
    if (!qBlock) return;

    const questionId = qBlock.dataset.questionId;

    if (target.type === 'radio') {
      const optionId = target.value.replace('opt_', '');
      autoSaveAnswer(questionId, optionId, null);
    }
    updateQuestionNav();
  });

  // Listen for textarea blur
  examForm?.querySelectorAll('textarea').forEach(txt => {
    txt.addEventListener('blur', () => {
      const qBlock = txt.closest('.question-block');
      if (!qBlock) return;
      const questionId = qBlock.dataset.questionId;
      autoSaveAnswer(questionId, null, txt.value);
      updateQuestionNav();
    });
  });

  // Question navigation buttons click to smooth scroll
  document.querySelectorAll('.q-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.targetQuestion;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  // Warn on accidental tab close / navigation
  window.addEventListener('beforeunload', (e) => {
    if (!hasSubmitted && examForm) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Mark form as submitted on explicit submit
  examForm?.addEventListener('submit', () => {
    hasSubmitted = true;
  });

  // Initial check
  updateQuestionNav();
});
