"use strict";

/* =========================================================
   STUDYQUEST ⭐
   Complete JavaScript for index.html
   Saves progress locally in this browser.
   ========================================================= */

const STORAGE_KEY = "studyquest_neon_v1";

const DEFAULT_STATE = {
  profile: {
    name: "",
    grade: ""
  },
  stars: 0,
  focusMinutes: 0,
  notes: [],
  flashcards: [],
  mindmaps: [],
  papers: [],
  completedQuests: [],
  quizResults: {
    attempts: 0,
    correct: 0
  }
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return structuredClone(DEFAULT_STATE);
    }

    const parsed = JSON.parse(saved);

    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      profile: {
        ...DEFAULT_STATE.profile,
        ...(parsed.profile || {})
      },
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : [],
      mindmaps: Array.isArray(parsed.mindmaps) ? parsed.mindmaps : [],
      papers: Array.isArray(parsed.papers) ? parsed.papers : [],
      completedQuests: Array.isArray(parsed.completedQuests)
        ? parsed.completedQuests
        : [],
      quizResults: {
        ...DEFAULT_STATE.quizResults,
        ...(parsed.quizResults || {})
      }
    };
  } catch (error) {
    console.error("Could not load saved StudyQuest progress:", error);
    return structuredClone(DEFAULT_STATE);
  }
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Could not save StudyQuest progress:", error);
    showToast("Your browser could not save this change.");
  }
}

/* -------------------- HELPERS -------------------- */

function $(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.style.opacity = "1";
  toast.style.transform = "translate(-50%,0)";

  clearTimeout(showToast.timeout);

  showToast.timeout = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translate(-50%,20px)";
  }, 2600);
}

function makeId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

function plural(number, singular, pluralForm = singular + "s") {
  return `${number} ${number === 1 ? singular : pluralForm}`;
}

function safeExternalURL(rawURL) {
  if (!rawURL) return "";

  try {
    const url = new URL(rawURL);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch (_) {
    return "";
  }

  return "";
}

function awardStars(amount, reason) {
  state.stars += amount;
  saveState();
  updateDashboard();
  renderQuests();

  showToast(`⭐ +${amount} Stars! ${reason}`);
}

/* -------------------- NAVIGATION -------------------- */

function showPage(pageName) {
  const requestedPage = $("page-" + pageName);

  if (!requestedPage) return;

  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page === requestedPage);
  });

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  if (pageName === "notes") renderNotes();
  if (pageName === "quiz") updateQuizLock();
  if (pageName === "flashcards") renderFlashcards();
  if (pageName === "mindmaps") renderMindmaps();
  if (pageName === "papers") renderPapers();
  if (pageName === "quests") renderQuests();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.go);
  });
});

/* -------------------- PROFILE -------------------- */

function renderProfile() {
  const name = state.profile.name || "Learner";
  const grade = state.profile.grade || "Choose your grade";

  $("profileName").textContent = name;
  $("profileGrade").textContent = grade;
  $("greeting").textContent = state.profile.name
    ? `Ready to learn, ${state.profile.name}?`
    : "Ready to learn?";

  $("studentName").value = state.profile.name;
  $("gradeSelect").value = state.profile.grade;
}

$("saveProfile").addEventListener("click", () => {
  const name = $("studentName").value.trim();
  const grade = $("gradeSelect").value;

  if (name.length > 32) {
    showToast("Please use a shorter nickname.");
    return;
  }

  state.profile.name = name;
  state.profile.grade = grade;

  saveState();
  renderProfile();

  showToast("Your study profile has been saved! 💜");
});

/* -------------------- QUEST SYSTEM -------------------- */

const QUESTS = [
  {
    id: "first-note",
    title: "Submit your first study note",
    description: "Save a topic you want to revise.",
    icon: "📚",
    reward: 10,
    condition: () => state.notes.length >= 1
  },
  {
    id: "first-card",
    title: "Create a flashcard",
    description: "Make a question and its answer.",
    icon: "🗂️",
    reward: 5,
    condition: () => state.flashcards.length >= 1
  },
  {
    id: "first-map",
    title: "Build a mind map",
    description: "Organize a topic into key ideas.",
    icon: "🕸️",
    reward: 5,
    condition: () => state.mindmaps.length >= 1
  },
  {
    id: "first-paper",
    title: "Add a past paper",
    description: "Save a paper or revision resource.",
    icon: "📄",
    reward: 5,
    condition: () => state.papers.length >= 1
  },
  {
    id: "first-focus",
    title: "Finish a focus session",
    description: "Complete one full timer session.",
    icon: "⏳",
    reward: 10,
    condition: () => state.focusMinutes >= 15
  },
  {
    id: "quiz-practice",
    title: "Try your first quiz",
    description: "Complete a quiz from your notes.",
    icon: "🧠",
    reward: 10,
    condition: () => state.quizResults.attempts >= 1
  }
];

function checkQuestProgress() {
  let earned = [];

  QUESTS.forEach(quest => {
    if (
      quest.condition() &&
      !state.completedQuests.includes(quest.id)
    ) {
      state.completedQuests.push(quest.id);
      state.stars += quest.reward;
      earned.push(quest);
    }
  });

  if (earned.length > 0) {
    saveState();
    updateDashboard();
    renderQuests();

    earned.forEach(quest => {
      showToast(`🎯 Quest complete! +${quest.reward} ⭐`);
    });
  }
}

function makeQuestHTML(quest) {
  const completed = state.completedQuests.includes(quest.id);

  return `
    <div class="quest">
      <div class="quest-icon">${quest.icon}</div>
      <div class="quest-info">
        <strong>${escapeHTML(quest.title)}</strong>
        <small>${escapeHTML(quest.description)}</small>
      </div>
      <div style="text-align:right">
        <div class="reward">⭐ ${quest.reward}</div>
        ${
          completed
            ? '<span class="pill">Completed ✓</span>'
            : '<span class="muted smalltext">In progress</span>'
        }
      </div>
    </div>
  `;
}

function renderQuests() {
  const allQuests = $("allQuests");
  const dashboardQuests = $("dashboardQuests");

  if (allQuests) {
    allQuests.innerHTML = QUESTS.map(makeQuestHTML).join("");
  }

  if (dashboardQuests) {
    const remaining = QUESTS.filter(
      quest => !state.completedQuests.includes(quest.id)
    );

    const visible = remaining.length
      ? remaining.slice(0, 3)
      : QUESTS.slice(0, 3);

    dashboardQuests.innerHTML = visible.map(makeQuestHTML).join("");
  }

  if ($("questStarBalance")) {
    $("questStarBalance").textContent = `${state.stars} ⭐`;
  }
}

/* -------------------- DASHBOARD -------------------- */

function updateDashboard() {
  $("starBalance").textContent = state.stars;
  $("questsDone").textContent = state.completedQuests.length;
  $("focusMinutes").textContent = state.focusMinutes;
  $("notesCount").textContent = state.notes.length;

  renderProfile();
  renderQuests();
}

function refreshEverything() {
  renderProfile();
  updateDashboard();
  renderNotes();
  updateQuizLock();
  renderFlashcards();
  renderMindmaps();
  renderPapers();
  renderQuests();
}

/* -------------------- STUDY NOTES -------------------- */

let selectedPDF = null;

$("pdfFile").addEventListener("change", event => {
  const file = event.target.files[0];

  selectedPDF = null;

  if (!file) {
    $("fileStatus").textContent = "No file selected yet.";
    return;
  }

  const isPDF =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPDF) {
    event.target.value = "";
    $("fileStatus").textContent = "Please select a PDF file.";
    showToast("Only PDF files are accepted.");
    return;
  }

  if (file.size > 15 * 1024 * 1024) {
    event.target.value = "";
    $("fileStatus").textContent = "The file is too large. Maximum: 15 MB.";
    showToast("Please choose a PDF smaller than 15 MB.");
    return;
  }

  selectedPDF = file;

  $("fileStatus").textContent =
    `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) selected.`;
});

$("submitNotes").addEventListener("click", () => {
  const title = $("noteTitle").value.trim();
  const text = $("noteText").value.trim();

  if (!title) {
    showToast("Give your study notes a title first.");
    $("noteTitle").focus();
    return;
  }

  if (!text && !selectedPDF) {
    showToast("Add note text or choose a PDF first.");
    return;
  }

  const note = {
    id: makeId(),
    title,
    text,
    fileName: selectedPDF ? selectedPDF.name : "",
    fileSize: selectedPDF ? selectedPDF.size : 0,
    createdAt: new Date().toISOString()
  };

  state.notes.unshift(note);

  saveState();

  $("noteTitle").value = "";
  $("noteText").value = "";
  $("pdfFile").value = "";
  $("fileStatus").textContent = "No file selected yet.";
  selectedPDF = null;

  renderNotes();
  updateQuizLock();
  updateDashboard();
  checkQuestProgress();

  showToast("Your study notes have been submitted! 📚");
});

function renderNotes() {
  const container = $("notesList");
  const pill = $("notePill");

  if (!container) return;

  if (pill) {
    pill.textContent = plural(state.notes.length, "note");
  }

  if (state.notes.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <div class="big">📝</div>
        Your submitted notes will appear here.
      </div>
    `;
    return;
  }

  container.innerHTML = state.notes.map(note => `
    <div class="list-item">
      <div style="min-width:0;flex:1">
        <strong>${escapeHTML(note.title)}</strong>
        <div class="muted smalltext">
          ${note.text ? "Text available for quiz practice" : "PDF saved as note information"}
        </div>
        ${
          note.fileName
            ? `<div class="muted smalltext">📄 ${escapeHTML(note.fileName)}</div>`
            : ""
        }
      </div>
      <div class="row" style="align-items:center">
        ${
          note.text
            ? `<button class="btn secondary small" data-quiz-note="${escapeHTML(note.id)}">Practise</button>`
            : ""
        }
        <button class="btn ghost small" data-delete-note="${escapeHTML(note.id)}">Delete</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll("[data-delete-note]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.deleteNote;

      if (!confirm("Delete these submitted notes?")) return;

      state.notes = state.notes.filter(note => note.id !== id);

      saveState();
      renderNotes();
      updateQuizLock();
      updateDashboard();

      showToast("Study notes deleted.");
    });
  });

  container.querySelectorAll("[data-quiz-note]").forEach(button => {
    button.addEventListener("click", () => {
      showPage("quiz");
      $("quizNoteSelect").value = button.dataset.quizNote;
      $("quizTitle").textContent = "Your notes quiz";
      $("quizArea").innerHTML = "";
    });
  });
}

/* -------------------- QUIZ ARENA -------------------- */

let activeQuiz = null;

function updateQuizLock() {
  const hasNotes = state.notes.length > 0;

  $("quizLocked").hidden = hasNotes;
  $("quizReady").hidden = !hasNotes;

  const selector = $("quizNoteSelect");
  if (!selector) return;

  const previousValue = selector.value;

  selector.innerHTML = state.notes.map(note => `
    <option value="${escapeHTML(note.id)}">
      ${escapeHTML(note.title)}${note.text ? "" : " (no text for quiz)"}
    </option>
  `).join("");

  if (state.notes.some(note => note.id === previousValue)) {
    selector.value = previousValue;
  }

  $("quizTitle").textContent = "Your notes quiz";
}

function makeQuizQuestions(note, requestedCount) {
  if (!note || !note.text) return [];

  const sentences = note.text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|[\n;]+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length >= 20);

  const candidates = [];

  sentences.forEach(sentence => {
    const words = sentence.match(/\b[\p{L}\p{N}][\p{L}\p{N}'-]*\b/gu) || [];
    const possibleAnswers = words.filter(word =>
      word.length >= 4 &&
      !/^\d+$/.test(word)
    );

    if (possibleAnswers.length < 2) return;

    const answer = possibleAnswers
      .slice()
      .sort((a, b) => b.length - a.length)[0];

    const escapedAnswer = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const questionText = sentence.replace(
      new RegExp(`\\b${escapedAnswer}\\b`, "i"),
      "________"
    );

    if (questionText === sentence) return;

    const distractors = [...new Set(
      (note.text.match(/\b[\p{L}][\p{L}'-]{3,}\b/gu) || [])
        .filter(word => word.toLowerCase() !== answer.toLowerCase())
        .filter(word => !sentence.toLowerCase().includes(word.toLowerCase()))
        .filter(word => word.length >= 4)
    )];

    const shuffledDistractors = distractors
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [answer, ...shuffledDistractors];

    if (options.length < 2) return;

    candidates.push({
      question: `Complete the sentence: ${questionText}`,
      answer,
      options: options.sort(() => Math.random() - 0.5)
    });
  });

  return candidates
    .sort(() => Math.random() - 0.5)
    .slice(0, requestedCount);
}

$("startQuiz").addEventListener("click", () => {
  const noteId = $("quizNoteSelect").value;
  const note = state.notes.find(item => item.id === noteId);

  if (!note) {
    showToast("Please choose your submitted notes.");
    return;
  }

  if (!note.text || note.text.trim().length < 20) {
    showToast("Add more note text to create quiz questions.");
    showPage("notes");
    return;
  }

  const requestedCount = Number($("quizQuestionCount").value) || 5;
  const questions = makeQuizQuestions(note, requestedCount);

  if (questions.length === 0) {
    showToast("Add a few complete sentences to your notes first.");
    showPage("notes");
    return;
  }

  activeQuiz = {
    noteId,
    questions,
    index: 0,
    correct: 0,
    answered: false
  };

  $("quizTitle").textContent = note.title;
  renderQuizQuestion();
});

function renderQuizQuestion() {
  const area = $("quizArea");

  if (!activeQuiz) {
    area.innerHTML = "";
    return;
  }

  if (activeQuiz.index >= activeQuiz.questions.length) {
    finishQuiz();
    return;
  }

  const question = activeQuiz.questions[activeQuiz.index];
  const number = activeQuiz.index + 1;
  const total = activeQuiz.questions.length;

  activeQuiz.answered = false;

  area.innerHTML = `
    <div class="notice">
      Question ${number} of ${total} · Correct answers: ${activeQuiz.correct}
    </div>
    <h3 style="line-height:1.6;margin-top:20px">
      ${escapeHTML(question.question)}
    </h3>
    <div id="quizOptions">
      ${question.options.map((option, index) => `
        <button class="quiz-option" data-answer-index="${index}">
          ${String.fromCharCode(65 + index)}. ${escapeHTML(option)}
        </button>
      `).join("")}
    </div>
    <div id="quizFeedback" class="smalltext" aria-live="polite"></div>
    <button class="btn" id="nextQuizQuestion" hidden>
      ${number === total ? "See results" : "Next question →"}
    </button>
  `;

  area.querySelectorAll("[data-answer-index]").forEach(button => {
    button.addEventListener("click", () => {
      if (activeQuiz.answered) return;

      activeQuiz.answered = true;

      const selectedIndex = Number(button.dataset.answerIndex);
      const selectedAnswer = question.options[selectedIndex];

      const correct = selectedAnswer.toLowerCase() ===
        question.answer.toLowerCase();

      if (correct) activeQuiz.correct++;

      area.querySelectorAll("[data-answer-index]").forEach(optionButton => {
        optionButton.disabled = true;

        const answer = question.options[
          Number(optionButton.dataset.answerIndex)
        ];

        if (answer.toLowerCase() === question.answer.toLowerCase()) {
          optionButton.classList.add("correct");
        } else if (optionButton === button) {
          optionButton.classList.add("wrong");
        }
      });

      $("quizFeedback").innerHTML = correct
        ? '<div class="notice good">Correct! Nice work! ⭐</div>'
        : `<div class="notice warn">Not quite. Correct answer: <strong>${escapeHTML(question.answer)}</strong></div>`;

      $("nextQuizQuestion").hidden = false;
    });
  });

  $("nextQuizQuestion").addEventListener("click", () => {
    activeQuiz.index++;
    renderQuizQuestion();
  });
}

function finishQuiz() {
  if (!activeQuiz) return;

  const total = activeQuiz.questions.length;
  const correct = activeQuiz.correct;
  const earned = Math.round((correct / total) * 10);

  state.quizResults.attempts++;
  state.quizResults.correct += correct;

  if (earned > 0) state.stars += earned;

  saveState();
  updateDashboard();
  checkQuestProgress();

  $("quizArea").innerHTML = `
    <div class="empty">
      <div class="big">${correct === total ? "🏆" : "🎉"}</div>
      <h3>Quiz complete!</h3>
      <p>You got <strong>${correct} out of ${total}</strong> questions correct.</p>
      <p>Accuracy: <strong>${Math.round(correct / total * 100)}%</strong></p>
      <p>You earned <strong>⭐ ${earned} Stars</strong>.</p>
      <button class="btn" id="retryQuiz">Try again</button>
    </div>
  `;

  $("retryQuiz").addEventListener("click", () => {
    activeQuiz = null;
    $("startQuiz").click();
  });

  activeQuiz = null;
}

/* -------------------- FLASHCARDS -------------------- */

let currentCardIndex = 0;
let cardFlipped = false;

$("addCard").addEventListener("click", () => {
  const question = $("cardQuestion").value.trim();
  const answer = $("cardAnswer").value.trim();

  if (!question || !answer) {
    showToast("Add both a question and an answer.");
    return;
  }

  state.flashcards.push({
    id: makeId(),
    question,
    answer,
    createdAt: new Date().toISOString()
  });

  $("cardQuestion").value = "";
  $("cardAnswer").value = "";

  currentCardIndex = state.flashcards.length - 1;
  cardFlipped = false;

  saveState();
  renderFlashcards();
  checkQuestProgress();

  showToast("Flashcard created! 🗂️");
});

function renderFlashcards() {
  const count = state.flashcards.length;

  $("cardCount").textContent = plural(count, "card");

  if (count === 0) {
    $("cardPractice").className = "empty";
    $("cardPractice").innerHTML = `
      <div class="big">🗂️</div>
      Add a card to practise.
    `;
    $("cardList").textContent = "No cards yet.";
    return;
  }

  currentCardIndex = Math.max(
    0,
    Math.min(currentCardIndex, count - 1)
  );

  const card = state.flashcards[currentCardIndex];

  $("cardPractice").className = "flashcard";
  $("cardPractice").innerHTML = cardFlipped
    ? `
      <div>
        <span class="pill">ANSWER</span>
        <p><strong>${escapeHTML(card.answer)}</strong></p>
        <small>Tap the card to see the question</small>
      </div>
    `
    : `
      <div>
        <span class="pill">QUESTION</span>
        <p><strong>${escapeHTML(card.question)}</strong></p>
        <small>Tap the card to reveal the answer</small>
      </div>
    `;

  $("cardPractice").onclick = () => {
    cardFlipped = !cardFlipped;
    renderFlashcards();
  };

  $("cardList").innerHTML = state.flashcards.map((item, index) => `
    <div class="list-item">
      <div style="flex:1;min-width:0">
        <strong>${index + 1}. ${escapeHTML(item.question)}</strong>
        <div class="muted smalltext">${escapeHTML(item.answer)}</div>
      </div>
      <button class="btn ghost small" data-delete-card="${escapeHTML(item.id)}">Delete</button>
    </div>
  `).join("");

  $("cardList").querySelectorAll("[data-delete-card]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.deleteCard;

      state.flashcards = state.flashcards.filter(card => card.id !== id);
      currentCardIndex = 0;
      cardFlipped = false;

      saveState();
      renderFlashcards();
      updateDashboard();

      showToast("Flashcard deleted.");
    });
  });
}

$("prevCard").addEventListener("click", () => {
  if (!state.flashcards.length) return;

  currentCardIndex =
    (currentCardIndex - 1 + state.flashcards.length) %
    state.flashcards.length;

  cardFlipped = false;
  renderFlashcards();
});

$("nextCard").addEventListener("click", () => {
  if (!state.flashcards.length) return;

  currentCardIndex =
    (currentCardIndex + 1) % state.flashcards.length;

  cardFlipped = false;
  renderFlashcards();
});

$("flipCard").addEventListener("click", () => {
  if (!state.flashcards.length) {
    showToast("Create a flashcard first.");
    return;
  }

  cardFlipped = !cardFlipped;
  renderFlashcards();
});

/* -------------------- MIND MAPS -------------------- */

let currentMindMap = null;

function buildMindMapHTML(topic, branches) {
  return `
    <div class="mind-node center-node">${escapeHTML(topic)}</div>
    ${branches.map(branch => `
      <div class="mind-node">${escapeHTML(branch)}</div>
    `).join("")}
  `;
}

$("makeMap").addEventListener("click", () => {
  const topic = $("mapTopic").value.trim();
  const branches = $("mapBranches").value
    .split(/[,;\n]+/)
    .map(branch => branch.trim())
    .filter(Boolean)
    .slice(0, 30);

  if (!topic) {
    showToast("Give your mind map a main topic.");
    return;
  }

  if (branches.length === 0) {
    showToast("Add at least one key idea.");
    return;
  }

  currentMindMap = {
    topic,
    branches,
    id: makeId()
  };

  $("mindmapView").innerHTML = buildMindMapHTML(topic, branches);

  showToast("Mind map generated! 🕸️");
});

$("saveMap").addEventListener("click", () => {
  if (!currentMindMap) {
    showToast("Generate a mind map before saving it.");
    return;
  }

  state.mindmaps.unshift({
    ...currentMindMap,
    createdAt: new Date().toISOString()
  });

  saveState();
  renderMindmaps();
  checkQuestProgress();

  showToast("Mind map saved! ⭐");
});

function renderMindmaps() {
  const container = $("mapList");

  if (!container) return;

  if (state.mindmaps.length === 0) {
    container.innerHTML = "No saved mind maps yet.";
    return;
  }

  container.innerHTML = state.mindmaps.map(map => `
    <div class="list-item">
      <div style="flex:1;min-width:0">
        <strong>🕸️ ${escapeHTML(map.topic)}</strong>
        <div class="muted smalltext">
          ${map.branches.length} key ideas:
          ${escapeHTML(map.branches.join(", "))}
        </div>
      </div>
      <div class="row" style="align-items:center">
        <button class="btn secondary small" data-open-map="${escapeHTML(map.id)}">Open</button>
        <button class="btn ghost small" data-delete-map="${escapeHTML(map.id)}">Delete</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll("[data-open-map]").forEach(button => {
    button.addEventListener("click", () => {
      const map = state.mindmaps.find(
        item => item.id === button.dataset.openMap
      );

      if (!map) return;

      currentMindMap = { ...map };

      $("mapTopic").value = map.topic;
      $("mapBranches").value = map.branches.join(", ");
      $("mindmapView").innerHTML = buildMindMapHTML(
        map.topic,
        map.branches
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  container.querySelectorAll("[data-delete-map]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.deleteMap;

      state.mindmaps = state.mindmaps.filter(map => map.id !== id);

      saveState();
      renderMindmaps();

      showToast("Mind map deleted.");
    });
  });
}

/* -------------------- PAST PAPERS -------------------- */

$("addPaper").addEventListener("click", () => {
  const title = $("paperTitle").value.trim();
  const rawURL = $("paperUrl").value.trim();
  const subject = $("paperSubject").value.trim();

  if (!title) {
    showToast("Enter a title for the past paper.");
    return;
  }

  let url = "";

  if (rawURL) {
    url = safeExternalURL(rawURL);

    if (!url) {
      showToast("Please enter a valid HTTP or HTTPS link.");
      return;
    }
  }

  state.papers.unshift({
    id: makeId(),
    title,
    url,
    subject,
    createdAt: new Date().toISOString()
  });

  $("paperTitle").value = "";
  $("paperUrl").value = "";
  $("paperSubject").value = "";

  saveState();
  renderPapers();
  checkQuestProgress();

  showToast("Past paper added! 📄");
});

function renderPapers() {
  const container = $("paperList");

  if (!container) return;

  $("paperCount").textContent = plural(state.papers.length, "paper");

  if (state.papers.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <div class="big">📄</div>
        Add a paper or link to keep it here.
      </div>
    `;
    return;
  }

  container.innerHTML = state.papers.map(paper => `
    <div class="paper-card" style="margin-bottom:12px">
      <div class="panel-head">
        <span class="pill">${escapeHTML(paper.subject || "Revision")}</span>
        <button class="btn ghost small" data-delete-paper="${escapeHTML(paper.id)}">Delete</button>
      </div>
      <h4>${escapeHTML(paper.title)}</h4>
      ${
        paper.url
          ? `<a href="${escapeHTML(paper.url)}" target="_blank" rel="noopener noreferrer" style="color:#d18cff;overflow-wrap:anywhere">Open paper ↗</a>`
          : '<p>Saved without an external link.</p>'
      }
    </div>
  `).join("");

  container.querySelectorAll("[data-delete-paper]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.deletePaper;

      state.papers = state.papers.filter(paper => paper.id !== id);

      saveState();
      renderPapers();

      showToast("Past paper deleted.");
    });
  });
}

/* -------------------- FOCUS TIMER -------------------- */

let timerInterval = null;
let timerRemaining = 25 * 60;
let timerRunning = false;
let timerEndTime = null;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(remainingSeconds).padStart(2, "0")
  );
}

function renderTimer() {
  $("timerDisplay").textContent = formatTime(timerRemaining);

  if (timerRunning) {
    $("timerLabel").textContent = "Focus time — you've got this!";
  } else if (timerRemaining === 0) {
    $("timerLabel").textContent = "Session complete! 🎉";
  } else {
    $("timerLabel").textContent = "Ready when you are";
  }

  $("timerStart").disabled = timerRunning;
  $("timerPause").disabled = !timerRunning;
}

function stopTimerInterval() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function completeTimerSession() {
  stopTimerInterval();

  timerRunning = false;
  timerRemaining = 0;
  timerEndTime = null;

  const sessionMinutes = Number($("timerMinutes").value) || 25;

  state.focusMinutes += sessionMinutes;
  state.stars += 3;

  saveState();
  renderTimer();
  updateDashboard();
  checkQuestProgress();

  showToast("🎉 Focus session complete! +3 ⭐ Stars");
}

function tickTimer() {
  if (!timerRunning || timerEndTime === null) return;

  timerRemaining = Math.max(
    0,
    Math.ceil((timerEndTime - Date.now()) / 1000)
  );

  renderTimer();

  if (timerRemaining <= 0) {
    completeTimerSession();
  }
}

function startTimer() {
  if (timerRunning) return;

  if (timerRemaining <= 0) {
    timerRemaining = (Number($("timerMinutes").value) || 25) * 60;
  }

  timerRunning = true;
  timerEndTime = Date.now() + timerRemaining * 1000;

  stopTimerInterval();
  timerInterval = setInterval(tickTimer, 250);

  renderTimer();
}

function pauseTimer() {
  if (!timerRunning) return;

  tickTimer();

  if (!timerRunning) return;

  timerRemaining = Math.max(
    0,
    Math.ceil((timerEndTime - Date.now()) / 1000)
  );

  timerRunning = false;
  timerEndTime = null;

  stopTimerInterval();
  renderTimer();
}

function resetTimer() {
  stopTimerInterval();

  timerRunning = false;
  timerEndTime = null;
  timerRemaining = (Number($("timerMinutes").value) || 25) * 60;

  renderTimer();
}

$("timerStart").addEventListener("click", startTimer);
$("timerPause").addEventListener("click", pauseTimer);
$("timerReset").addEventListener("click", resetTimer);

$("timerMinutes").addEventListener("change", () => {
  if (timerRunning) {
    showToast("Pause or finish the current session before changing its length.");
    $("timerMinutes").value = String(
      Math.max(15, Math.min(45, Math.round(timerRemaining / 60)))
    );
    return;
  }

  resetTimer();
});

document.addEventListener("visibilitychange", () => {
  if (timerRunning && !document.hidden) {
    tickTimer();
  }
});

/* -------------------- STARTUP -------------------- */

function initStudyQuest() {
  refreshEverything();
  updateQuizLock();
  renderTimer();

  if (state.profile.name) {
    $("greeting").textContent =
      `Ready to learn, ${state.profile.name}?`;
  }

  console.log("StudyQuest initialized successfully ⭐");
}

initStudyQuest();




