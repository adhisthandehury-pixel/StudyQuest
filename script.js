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
shopOwned: [],
shopEquipped: {
  skin: "",
  cosmetic: "",
  theme: ""
},

  focusMinutes: 0,
   focusSessionsCompleted: 0,
freezeProgress: 0,
streakFreezes: 0,
currentStreak: 0,
longestStreak: 0,
lastFocusDate: "",
unlockedTitles: [],
selectedTitle: "",
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
       focusSessionsCompleted: Math.max(
  0,
  Number(parsed.focusSessionsCompleted) || 0
),

freezeProgress: Math.max(
  0,
  Number(parsed.freezeProgress) || 0
),

streakFreezes: Math.max(
  0,
  Number(parsed.streakFreezes) || 0
),

currentStreak: Math.max(
  0,
  Number(parsed.currentStreak) || 0
),

longestStreak: Math.max(
  0,
  Number(parsed.longestStreak) || 0
),

lastFocusDate:
  typeof parsed.lastFocusDate === "string"
    ? parsed.lastFocusDate
    : "",

unlockedTitles: Array.isArray(parsed.unlockedTitles)
  ? parsed.unlockedTitles
  : [],

selectedTitle:
  typeof parsed.selectedTitle === "string"
    ? parsed.selectedTitle
    : "",
       shopOwned: Array.isArray(parsed.shopOwned)
  ? parsed.shopOwned
  : [],

shopEquipped: {
  skin: "",
  cosmetic: "",
  theme: "",
  ...(parsed.shopEquipped || {})
},
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
function getWeekendKey() {
  const now = new Date();
  const day = now.getDay();
  const daysSinceFriday = (day + 2) % 7;

  now.setDate(now.getDate() - daysSinceFriday);

  return now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    String(now.getDate()).padStart(2, "0");
}

function completeWeekendObjective(objective) {
  const now = new Date();

  if (![0, 5, 6].includes(now.getDay())) {
    showToast("🏆 Weekend Legend is available Friday to Sunday!");
    return;
  }

  const key = getWeekendKey();

  if (!state.weekendLegend || state.weekendLegend.week !== key) {
    state.weekendLegend = {
      week: key,
      completed: [],
      bonusClaimed: false
    };
  }

  const challenge = state.weekendLegend;
  const progress = document.getElementById("weekendLegendProgress");

if (progress) {
  progress.textContent =
    `Progress: ${challenge.completed.length}/4 objectives`;
} 

  if (!challenge.completed.includes(objective)) {
    challenge.completed.push(objective);
  }

  const required = ["quiz", "blurting", "paper", "quests"];

  if (
    required.every(item => challenge.completed.includes(item)) &&
    !challenge.bonusClaimed
  ) {
    challenge.bonusClaimed = true;
    awardStars(200, "WEEKEND LEGEND completed!");
  } else {
    saveState();
    showToast("🏆 Weekend Legend progress saved!");
  }
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
  if (pageName === "blurting") updateBlurtingLock();
  if (pageName === "quiz") updateQuizLock();
  if (pageName === "flashcards") renderFlashcards();
  if (pageName === "mindmaps") renderMindmaps();
  if (pageName === "papers") renderPapers();
  if (pageName === "quests") renderQuests();
  if (pageName === "shop") renderShop();

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
  $("profileGrade").textContent = grade
     $("profileTitle").textContent = state.selectedTitle
  ? ({
      "flow-spammer": "⚡ Flow Spammer",
      "david-goggins": "🏆 David Goggins"
    }[state.selectedTitle] || "No title equipped")
  : "No title equipped";
  $("greeting").textContent = state.profile.name
    ? `Ready to learn, ${state.profile.name}?`
    : "Ready to learn?";

  $("studentName").value = state.profile.name;
  $("gradeSelect").value = state.profile.grade;
}
function renderTitles() {
  const titleSelect = $("titleSelect");
  const dashboardTitles = $("dashboardTitles");
  const profileTitle = $("profileTitle");

  const titles = [
    {
      id: "flow-spammer",
      name: "Flow Spammer",
      icon: "⚡",
      requirement: "Complete 3 focus sessions",
      unlocked: state.focusSessionsCompleted >= 3
    },
    {
      id: "david-goggins",
      name: "David Goggins",
      icon: "🏆",
      requirement: "Reach a 365-day streak",
      unlocked: state.currentStreak >= 365
    }
  ];

  // Keep unlocked titles saved permanently.
  titles.forEach(title => {
    if (
      title.unlocked &&
      !state.unlockedTitles.includes(title.id)
    ) {
      state.unlockedTitles.push(title.id);
    }
  });

  // Only allow titles that have actually been unlocked.
  const unlockedTitles = titles.filter(title =>
    state.unlockedTitles.includes(title.id)
  );

  // Clear an equipped title if it isn't unlocked.
  if (
    state.selectedTitle &&
    !state.unlockedTitles.includes(state.selectedTitle)
  ) {
    state.selectedTitle = "";
  }

  titleSelect.innerHTML =
    '<option value="">No title equipped</option>' +
    unlockedTitles.map(title =>
      `<option value="${title.id}">${title.icon} ${title.name}</option>`
    ).join("");

  titleSelect.value = state.selectedTitle;

  const equipped = titles.find(
    title => title.id === state.selectedTitle
  );

  profileTitle.textContent = equipped
    ? `${equipped.icon} ${equipped.name}`
    : "No title equipped";

  dashboardTitles.innerHTML = titles.map(title => {
    const unlocked = state.unlockedTitles.includes(title.id);
    const equippedTitle = state.selectedTitle === title.id;

    return `
      <div class="quest">
        <div class="quest-icon">${title.icon}</div>
        <div class="quest-info">
          <strong>${title.name}</strong>
          <small>
            ${unlocked ? "Unlocked!" : title.requirement}
          </small>
        </div>
        <div>
          <span class="pill">
            ${equippedTitle ? "Equipped ✓" : unlocked ? "Unlocked" : "Locked 🔒"}
          </span>
        </div>
      </div>
    `;
  }).join("");

  saveState();
}
$("titleSelect").addEventListener("change", () => {
  const chosenTitle = $("titleSelect").value;

  if (
    chosenTitle &&
    !state.unlockedTitles.includes(chosenTitle)
  ) {
    showToast("🔒 Unlock this title first!");
    return;
  }

  state.selectedTitle = chosenTitle;

  saveState();
  renderTitles();

  showToast(
    chosenTitle
      ? "🏆 Title equipped!"
      : "Title unequipped."
  );
});

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

  if (
    QUESTS.length > 0 &&
    QUESTS.every(quest =>
      state.completedQuests.includes(quest.id)
    )
  ) {
    completeWeekendObjective("quests");
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
  $("currentStreak").textContent = state.currentStreak;
  $("longestStreak").textContent = state.longestStreak;
  $("streakFreezes").textContent = state.streakFreezes;
  $("focusSessionsCompleted").textContent = state.focusSessionsCompleted;

  renderProfile();
  renderQuests();
  renderTitles();
  const weekendProgress = document.getElementById("weekendLegendProgress");

if (weekendProgress) {
  const completed = state.weekendLegend &&
    state.weekendLegend.week === getWeekendKey()
      ? state.weekendLegend.completed.length
      : 0;

  weekendProgress.textContent = `Progress: ${completed}/4 objectives`;
} 

function refreshEverything() {
  renderProfile();
  updateDashboard();
  renderNotes();
  updateQuizLock();
  updateBlurtingLock();
  renderFlashcards();
  renderMindmaps();
  renderPapers();
  renderQuests();
}function refreshEverything() {
  renderProfile();
  updateDashboard();
  renderNotes();
  updateQuizLock();
  updateBlurtingLock();
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
  updateBlurtingLock();
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
      updateBlurtingLock();
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

/* -------------------- BLURTING ARENA -------------------- */

let currentBlurtNoteId = "";
let blurtingDrafts = {};

try {
  blurtingDrafts = JSON.parse(
    localStorage.getItem("studyquest_blurting_drafts_v1") || "{}"
  );

  if (
    !blurtingDrafts ||
    typeof blurtingDrafts !== "object" ||
    Array.isArray(blurtingDrafts)
  ) {
    blurtingDrafts = {};
  }
} catch (error) {
  blurtingDrafts = {};
}

function saveBlurtingDrafts() {
  try {
    localStorage.setItem(
      "studyquest_blurting_drafts_v1",
      JSON.stringify(blurtingDrafts)
    );
  } catch (error) {
    showToast("Could not save your blurt draft.");
  }
}

function updateBlurtingLock() {
  const locked = $("blurtingLocked");
  const ready = $("blurtingReady");
  const status = $("blurtingStatus");
  const selector = $("blurtingNoteSelect");

  if (!locked || !ready || !status || !selector) return;

  // Notes with actual text can be used as answer guides.
  const usableNotes = state.notes.filter(
    note => typeof note.text === "string" && note.text.trim().length > 0
  );

  const hasUsableNotes = usableNotes.length > 0;

  locked.hidden = hasUsableNotes;
  ready.hidden = !hasUsableNotes;

  status.textContent = hasUsableNotes ? "🔓 Unlocked" : "🔒 Locked";

  if (!hasUsableNotes) {
    selector.innerHTML = "";
    currentBlurtNoteId = "";
    return;
  }

  const previousId = selector.value || currentBlurtNoteId;

  selector.innerHTML = usableNotes.map(note => `
    <option value="${escapeHTML(note.id)}">
      ${escapeHTML(note.title)}
    </option>
  `).join("");

  if (usableNotes.some(note => note.id === previousId)) {
    selector.value = previousId;
  } else {
    selector.value = usableNotes[0].id;
  }

  currentBlurtNoteId = selector.value;
  loadBlurtingDraft();
}

function loadBlurtingDraft() {
  const selector = $("blurtingNoteSelect");
  const answer = $("blurtingAnswer");
  const results = $("blurtingResults");
  const message = $("blurtingMessage");

  if (!selector || !answer) return;

  currentBlurtNoteId = selector.value;

  answer.value = blurtingDrafts[currentBlurtNoteId] || "";

  if (results) results.hidden = true;
  if (message) message.hidden = true;
}

function saveCurrentBlurtDraft() {
  const selector = $("blurtingNoteSelect");
  const answer = $("blurtingAnswer");

  if (!selector || !answer || !selector.value) return;

  blurtingDrafts[selector.value] = answer.value;
  saveBlurtingDrafts();
}

function tokenizeBlurt(text) {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
    .filter(word => word.length > 2);
}

function compareBlurtToNotes(sourceText, blurtText) {
  const sourceWords = new Set(tokenizeBlurt(sourceText));
  const blurtWords = new Set(tokenizeBlurt(blurtText));

  const stopWords = new Set([
    "the", "and", "for", "are", "was", "were", "with", "that",
    "this", "from", "into", "their", "there", "they", "them",
    "then", "than", "have", "has", "had", "not", "but", "can",
    "could", "would", "should", "will", "its", "about", "which",
    "when", "where", "what", "who", "how", "why", "all", "any",
    "you", "your", "our", "out", "use", "used", "using", "also",
    "such", "each", "more", "most", "some", "many", "much",
    "been", "being", "because", "through", "these", "those"
  ]);

  const missing = [...sourceWords]
    .filter(word => !stopWords.has(word) && !blurtWords.has(word))
    .sort((a, b) => a.localeCompare(b));

  const covered = [...sourceWords]
    .filter(word => !stopWords.has(word) && blurtWords.has(word));

  return {
    missing,
    covered,
    sourceCount: [...sourceWords].filter(word => !stopWords.has(word)).length
  };
}

function renderBlurtResults(note, blurtText) {
  const results = $("blurtingResults");
  const guide = $("blurtingGuide");
  const summary = $("blurtingSummary");

  if (!results || !guide || !summary) return;

  const comparison = compareBlurtToNotes(note.text, blurtText);

  const sourceWords = new Set(tokenizeBlurt(note.text));
  const stopWords = new Set([
    "the", "and", "for", "are", "was", "were", "with", "that",
    "this", "from", "into", "their", "there", "they", "them",
    "then", "than", "have", "has", "had", "not", "but", "can",
    "could", "would", "should", "will", "its", "about", "which",
    "when", "where", "what", "who", "how", "why", "all", "any",
    "you", "your", "our", "out", "use", "used", "using", "also",
    "such", "each", "more", "most", "some", "many", "much",
    "been", "being", "because", "through", "these", "those"
  ]);

  const highlightedSource = note.text
    .split(/(\s+)/)
    .map(part => {
      const word = part.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

      if (word && sourceWords.has(word) &&
          !stopWords.has(word) &&
          !tokenizeBlurt(blurtText).includes(word)) {
        return `<span style="color:#ff647c;font-weight:700">${escapeHTML(part)}</span>`;
      }

      return escapeHTML(part);
    })
    .join("");

  guide.innerHTML = `
    <h4>📚 Your submitted notes: ${escapeHTML(note.title)}</h4>
    <div class="panel" style="white-space:pre-wrap;line-height:1.8">
      ${highlightedSource}
    </div>
    <h4>🔴 Concepts or words to revisit</h4>
    ${
      comparison.missing.length
        ? `<p>${comparison.missing.map(word =>
            `<span style="display:inline-block;color:#ff647c;border:1px solid #ff647c;border-radius:8px;padding:4px 8px;margin:3px">${escapeHTML(word)}</span>`
          ).join("")}</p>`
        : "<p>Great! No missing keywords were detected.</p>"
    }
  `;

  const percentage = comparison.sourceCount
    ? Math.round(comparison.covered.length / comparison.sourceCount * 100)
    : 0;

  summary.textContent =
    `Keyword coverage: ${percentage}%. ` +
    `${comparison.missing.length} source keywords were not detected. ` +
    "This is a basic word comparison, not a full understanding score. " +
    "Different wording and synonyms may not be recognised.";

  results.hidden = false;
}

if ($("blurtingNoteSelect")) {
  $("blurtingNoteSelect").addEventListener("change", () => {
    loadBlurtingDraft();
  });
}

if ($("saveBlurtDraft")) {
  $("saveBlurtDraft").addEventListener("click", () => {
    saveCurrentBlurtDraft();
    showToast("Blurt draft saved! 💾");
  });
}

if ($("clearBlurt")) {
  $("clearBlurt").addEventListener("click", () => {
    if (!confirm("Clear your blurt for this chapter?")) return;

    const selector = $("blurtingNoteSelect");
    const answer = $("blurtingAnswer");

    if (selector && answer) {
      answer.value = "";
      blurtingDrafts[selector.value] = "";
      saveBlurtingDrafts();
    }

    if ($("blurtingResults")) $("blurtingResults").hidden = true;
    if ($("blurtingMessage")) $("blurtingMessage").hidden = true;

    showToast("Blurt page cleared.");
  });
}

    if (!blurtText) {
      showToast("Write what you remember before revealing the guide.");
      $("blurtingAnswer").focus();
      return;
    }

    saveCurrentBlurtDraft();
    renderBlurtResults(note, blurtText);
    completeWeekendObjective("blurting");

// Award 10 Stars only once per submitted note.
if (!Array.isArray(state.completedBlurtingNotes)) {
  state.completedBlurtingNotes = [];
}

if (!Array.isArray(state.completedBlurtingNotes)) {
  state.completedBlurtingNotes = [];
}

if (!state.completedBlurtingNotes.includes(note.id)) {
  showToast("DEBUG: First reward for this note.");
  state.completedBlurtingNotes.push(note.id);
  awardStars(10, "Blurting challenge completed!");
} else {
  showToast("DEBUG: This note was already rewarded.");
}
  });
}

if ($("tryBlurtAgain")) {
  $("tryBlurtAgain").addEventListener("click", () => {
    if ($("blurtingResults")) $("blurtingResults").hidden = true;
    if ($("blurtingMessage")) $("blurtingMessage").hidden = true;

    $("blurtingAnswer").focus();
  });
}

/* -------------------- END BLURTING ARENA -------------------- */

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
  completeWeekendObjective("quiz");

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

let currentPracticePaper = null;

function getPaperSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|[;]+/)
    .map(sentence => sentence.trim())
    .filter(sentence => {
      const words = sentence.match(/\b[\p{L}\p{N}][\p{L}\p{N}'-]*\b/gu) || [];
      return sentence.length >= 20 && words.length >= 5;
    });
}

function makePracticePaperQuestions(text, totalMarks) {
  const sentences = getPaperSentences(text);

  if (sentences.length === 0) return [];

  const questions = [];
  let remainingMarks = totalMarks;
  let sentenceIndex = 0;

  while (remainingMarks > 0 && questions.length < 20) {
    let marks;

    if (remainingMarks >= 5 && questions.length % 4 === 3) {
      marks = 5;
    } else if (remainingMarks >= 3 && questions.length % 3 === 2) {
      marks = 3;
    } else if (remainingMarks >= 2) {
      marks = 2;
    } else {
      marks = 1;
    }

    if (marks > remainingMarks) {
      marks = remainingMarks;
    }

    const sentence = sentences[sentenceIndex % sentences.length];
    sentenceIndex++;

    const words = sentence.match(/\b[\p{L}\p{N}][\p{L}\p{N}'-]*\b/gu) || [];

    const answerWord = words
      .filter(word => word.length >= 4 && !/^\d+$/.test(word))
      .sort((a, b) => b.length - a.length)[0];

    let question;
    let answer;

    if (marks === 1 && answerWord) {
      const escapedWord = answerWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      question = `Fill in the blank: ${sentence.replace(
        new RegExp(`\\b${escapedWord}\\b`, "i"),
        "________"
      )}`;

      answer = answerWord;
    } else if (marks <= 2) {
      question = `State the key idea described in your notes: "${sentence}"`;

      answer = sentence;
    } else if (marks <= 3) {
      question = `Explain the following idea in your own words: "${sentence}"`;

      answer = sentence;
    } else {
      question = `Discuss the following idea and explain its importance: "${sentence}"`;

      answer = sentence;
    }

    questions.push({
      number: questions.length + 1,
      question,
      answer,
      marks
    });

    remainingMarks -= marks;
  }

  return questions;
}

function getPracticePaperSource() {
  const pastedNotes = $("paperSourceNotes").value.trim();

  if (pastedNotes) {
    return pastedNotes;
  }

  return state.notes
    .map(note => note.text || "")
    .filter(Boolean)
    .join("\n");
}

function renderGeneratedPracticePaper() {
  const output = $("generatedPaper");
  const answerGuide = $("paperAnswerGuide");
  const answerButton = $("showPaperAnswers");

  if (!output || !currentPracticePaper) return;

  const paper = currentPracticePaper;

  output.innerHTML = `
    <div class="notice">
      <strong>${escapeHTML(paper.subject)}</strong>
      <br>
      Total marks: ${paper.questions.reduce((sum, q) => sum + q.marks, 0)}
      <br>
      Questions: ${paper.questions.length}
    </div>

    <h3>Instructions</h3>
    <p>Answer all questions. Read each question carefully and use your study notes to revise.</p>

    ${paper.questions.map(question => `
      <div class="list-item" style="display:block;margin-bottom:12px">
        <strong>
          Q${question.number}. ${escapeHTML(question.question)}
        </strong>
        <div class="muted smalltext" style="margin-top:8px">
          [${question.marks} ${question.marks === 1 ? "mark" : "marks"}]
        </div>
      </div>
    `).join("")}

    <div class="notice">
      ⭐ Practice complete? Try answering every question before checking the answer guide.
    </div>
  `;

  answerGuide.innerHTML = `
    <h3>🗝️ Answer Guide</h3>
    <p>Use these answers to check your understanding. Longer answers may need additional explanation.</p>

    ${paper.questions.map(question => `
      <div class="list-item" style="display:block;margin-bottom:12px">
        <strong>Q${question.number}. Answer</strong>
        <p>${escapeHTML(question.answer)}</p>
        <div class="muted smalltext">
          ${question.marks} ${question.marks === 1 ? "mark" : "marks"}
        </div>
      </div>
    `).join("")}
  `;

  answerGuide.hidden = true;

  if (answerButton) {
    answerButton.textContent = "Show Answer Guide";
    answerButton.hidden = false;
  }
}

$("generatePracticePaper").addEventListener("click", () => {
  const subject = $("paperSubject").value.trim() || "General Studies";
  const totalMarks = Number($("paperMarks").value) || 20;
  const sourceNotes = getPracticePaperSource();

  if (sourceNotes.length < 40) {
    showToast("Please submit notes or paste enough study text first.");
    $("paperSourceNotes").focus();
    return;
  }

  const questions = makePracticePaperQuestions(sourceNotes, totalMarks);

  if (questions.length === 0) {
    showToast("Add a few complete sentences to your study notes first.");
    return;
  }

  currentPracticePaper = {
    id: makeId(),
    title: `${subject} Practice Paper`,
    subject,
    questions,
    createdAt: new Date().toISOString()
  };

  state.papers.unshift({
    id: currentPracticePaper.id,
    title: currentPracticePaper.title,
    subject,
    url: "",
    createdAt: currentPracticePaper.createdAt
  });

   saveState();
  renderGeneratedPracticePaper();
  checkQuestProgress();
  completeWeekendObjective("paper");

  showToast("Your practice paper is ready! 📝");
});

$("showPaperAnswers").addEventListener("click", () => {
  const answerGuide = $("paperAnswerGuide");
  const answerButton = $("showPaperAnswers");

  if (!currentPracticePaper || !answerGuide) {
    showToast("Generate a practice paper first.");
    return;
  }

  answerGuide.hidden = !answerGuide.hidden;

  answerButton.textContent = answerGuide.hidden
    ? "Show Answer Guide"
    : "Hide Answer Guide";
});

function renderPapers() {
  // Practice papers are displayed in #generatedPaper.
  // Keep this function so the rest of StudyQuest can call it safely.
  const output = $("generatedPaper");

  if (!output) return;

  if (currentPracticePaper) {
    renderGeneratedPracticePaper();
  }
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
function recordDailyStreak() {
  const now = new Date();

  // Get today's date in local time
  const today =
    now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    String(now.getDate()).padStart(2, "0");

  // Don't increase the streak twice on the same day
  if (state.lastFocusDate === today) {
    return;
  }

  // First completed focus session
  if (!state.lastFocusDate) {
    state.currentStreak = 1;
  } else {
    const previousDate = new Date(
      state.lastFocusDate + "T00:00:00"
    );

    const todayDate = new Date(today + "T00:00:00");

    const daysPassed = Math.round(
      (todayDate - previousDate) / 86400000
    );

    if (daysPassed === 1) {
      // Studied on the next consecutive day
      state.currentStreak += 1;
    } else if (daysPassed > 1) {
      const missedDays = daysPassed - 1;

      if (state.streakFreezes >= missedDays) {
        // Automatically use freezes to protect every missed day
        state.streakFreezes -= missedDays;
        state.currentStreak += daysPassed;

        showToast(
          "🧊 Streak protected! " +
          missedDays +
          " freeze(s) used."
        );
      } else {
        // Not enough freezes: start a new streak
        state.currentStreak = 1;
      }
    }
  }

  state.lastFocusDate = today;

  // Update the longest streak
  if (state.currentStreak > state.longestStreak) {
    state.longestStreak = state.currentStreak;
  }

  // Unlock David Goggins at 365 streak days
  if (
    state.currentStreak >= 365 &&
    !state.unlockedTitles.includes("david-goggins")
  ) {
    state.unlockedTitles.push("david-goggins");

    showToast("🏆 Title unlocked: David Goggins!");
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
   state.focusSessionsCompleted += 1;
   recordDailyStreak();
state.freezeProgress += 1;

if (state.freezeProgress >= 3) {
  state.streakFreezes += Math.floor(state.freezeProgress / 3);
  state.freezeProgress %= 3;

  showToast("🧊 You earned a Streak Freeze!");
}

if (
  state.focusSessionsCompleted >= 3 &&
  !state.unlockedTitles.includes("flow-spammer")
) {
  state.unlockedTitles.push("flow-spammer");
  showToast("🏆 Title unlocked: Flow Spammer!");
}

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
/* -------------------- STUDYQUEST AI -------------------- */

/*
  After deploying your backend, replace this placeholder with
  your actual Cloudflare Worker URL.
*/
const STUDYQUEST_AI_API = "https://studyquestai.adhisthandehury.workers.dev";

let aiChatHistory = [];
let aiBusy = false;

function addAIMessage(role, message) {
  const chat = $("aiChat");
  const bubble = document.createElement("div");

  bubble.style.cssText =
    "padding:12px;margin:8px 0;border-radius:12px;" +
    "background:" +
    (role === "user" ? "#3b1755" : "#241039") +
    ";white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6";

  const label = document.createElement("strong");
  label.textContent = role === "user"
    ? "🧑 You"
    : "🤖 StudyQuest AI";

  const content = document.createElement("div");
  content.style.marginTop = "6px";
  content.textContent = message;

  bubble.append(label, content);
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;

  return bubble;
}

function setAIMaterialStatus(message) {
  $("aiMaterialStatus").textContent = message;
}

$("aiPdf").addEventListener("change", () => {
  const file = $("aiPdf").files[0];

  if (!file) {
    setAIMaterialStatus("No PDF selected.");
    return;
  }

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    $("aiPdf").value = "";
    setAIMaterialStatus("Please select a PDF file.");
    return;
  }

  if (file.size > 8 * 1024 * 1024) {
    $("aiPdf").value = "";
    setAIMaterialStatus("PDF too large. Maximum size is 8 MB.");
    return;
  }

  setAIMaterialStatus(
    "PDF selected: " + file.name +
    ". It will be sent securely when you ask a question."
  );
});

$("aiNotes").addEventListener("input", () => {
  if ($("aiNotes").value.trim()) {
    setAIMaterialStatus("Pasted study notes are ready.");
  }
});

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");

      resolve(result.slice(comma + 1));
    };

    reader.onerror = () => {
      reject(new Error("Could not read the PDF file."));
    };

    reader.readAsDataURL(file);
  });
}

async function askStudyQuestAI(question) {
  if (aiBusy) return;

  if (
    !STUDYQUEST_AI_API.startsWith("https://") ||
    STUDYQUEST_AI_API.includes("PASTE_YOUR_WORKER_URL")
  ) {
    addAIMessage(
      "assistant",
      "The AI backend hasn't been connected yet. Deploy the secure " +
      "backend and add its URL to script.js first."
    );
    return;
  }

  const notes = $("aiNotes").value.trim();
  const pdf = $("aiPdf").files[0];

  if (!notes && !pdf) {
    addAIMessage(
      "assistant",
      "Please paste your notes or select a PDF first so I can help " +
      "you study that material."
    );
    return;
  }

  if (question.length > 2000) {
    addAIMessage("assistant", "Please keep your question under 2,000 characters.");
    return;
  }

  aiBusy = true;
  $("aiSend").disabled = true;
  $("aiSend").textContent = "Thinking...";

  const loading = addAIMessage("assistant", "Reading your material...");

  try {
    let pdfBase64 = "";

    if (pdf) {
      pdfBase64 = await fileToBase64(pdf);
    }

    const response = await fetch(STUDYQUEST_AI_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question,
        notes,
        pdfBase64,
        pdfName: pdf ? pdf.name : "",
        history: aiChatHistory.slice(-8)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "The AI request failed.");
    }

    if (!data.answer) {
      throw new Error("The AI returned an empty answer.");
    }

    loading.remove();
    addAIMessage("assistant", data.answer);

    aiChatHistory.push(
      { role: "user", text: question },
      { role: "model", text: data.answer }
    );

    aiChatHistory = aiChatHistory.slice(-8);
  } catch (error) {
    loading.remove();

    addAIMessage(
      "assistant",
      "I couldn't answer that just now. " +
      (error.message || "Please try again.")
    );
  } finally {
    aiBusy = false;
    $("aiSend").disabled = false;
    $("aiSend").textContent = "✨ Ask StudyQuest AI";
  }
}

$("aiForm").addEventListener("submit", async event => {
  event.preventDefault();

  const question = $("aiQuestion").value.trim();
  if (!question || aiBusy) return;

  addAIMessage("user", question);
  $("aiQuestion").value = "";

  await askStudyQuestAI(question);
});

document.querySelectorAll("[data-ai-prompt]").forEach(button => {
  button.addEventListener("click", async () => {
    if (aiBusy) return;

    const question = button.dataset.aiPrompt;
    addAIMessage("user", question);
    await askStudyQuestAI(question);
  });
});

$("aiClear").addEventListener("click", () => {
  aiChatHistory = [];
  $("aiChat").replaceChildren();

  addAIMessage(
    "assistant",
    "Chat cleared! Your current study material is still selected. What would you like to learn?"
  );
});

/* -------------------- END STUDYQUEST AI -------------------- */

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

/* ================= STAR SHOP SYSTEM ================= */

const SHOP_ITEMS = [
  {
    id: "skin_galaxy",
    category: "skins",
    name: "Galaxy Skin",
    icon: "🌌",
    price: 100,
    description: "A cosmic look for your learner profile."
  },
  {
    id: "skin_flame",
    category: "skins",
    name: "Neon Flame",
    icon: "🔥",
    price: 250,
    description: "Bring fiery neon energy to your profile."
  },
  {
    id: "skin_champion",
    category: "skins",
    name: "Royal Champion",
    icon: "👑",
    price: 500,
    description: "A legendary champion style."
  },
  {
    id: "cos_sparkle",
    category: "cosmetics",
    name: "Sparkle Effect",
    icon: "✨",
    price: 75,
    description: "Add a magical sparkle effect to your profile."
  },
  {
    id: "cos_lightning",
    category: "cosmetics",
    name: "Lightning Badge",
    icon: "⚡",
    price: 150,
    description: "Show off your lightning badge."
  },
  {
    id: "cos_champion",
    category: "cosmetics",
    name: "Champion Badge",
    icon: "🏆",
    price: 300,
    description: "Celebrate your study achievements."
  },
  {
    id: "theme_midnight",
    category: "themes",
    name: "Midnight",
    icon: "🌙",
    price: 100,
    description: "A deep midnight theme."
  },
  {
    id: "theme_cosmic",
    category: "themes",
    name: "Cosmic Purple",
    icon: "🪐",
    price: 250,
    description: "A vibrant cosmic-purple theme."
  },
  {
    id: "theme_crystal",
    category: "themes",
    name: "Crystal Galaxy",
    icon: "💎",
    price: 400,
    description: "A bright crystal-galaxy theme."
  }
];

let currentShopCategory = "skins";

function getShopItem(id) {
  return SHOP_ITEMS.find(item => item.id === id);
}

function showShopMessage(message) {
  const element = $("shopMessage");
  if (element) element.textContent = message;
}

function renderShop() {
  const balance = $("shopBalance");
  const container = $("shopItems");

  if (!balance || !container) return;

  balance.textContent = `${state.stars} ⭐`;

  document.querySelectorAll("[data-shop-category]").forEach(button => {
    const active = button.dataset.shopCategory === currentShopCategory;

    button.classList.toggle("active", active);
    button.classList.toggle("secondary", !active);
  });

  let items;

  if (currentShopCategory === "inventory") {
    items = SHOP_ITEMS.filter(item =>
      state.shopOwned.includes(item.id)
    );
  } else {
    items = SHOP_ITEMS.filter(item =>
      item.category === currentShopCategory
    );
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <div class="big">🎒</div>
        <p>No items here yet. Visit another category!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const owned = state.shopOwned.includes(item.id);
    const equipped = state.shopEquipped[item.category] === item.id;

    let actionButton = "";

    if (!owned) {
      actionButton = `
        <button class="btn" data-shop-buy="${item.id}">
          Buy for ⭐ ${item.price}
        </button>
      `;
    } else {
      actionButton = `
        <button class="btn ${equipped ? "secondary" : ""}"
          data-shop-equip="${item.id}">
          ${equipped ? "Unequip" : "Equip"}
        </button>
      `;
    }

    return `
      <div class="shop-item">
        <div class="shop-item-art">${item.icon}</div>
        <h3>${escapeHTML(item.name)}</h3>
        <p>${escapeHTML(item.description)}</p>
        <div class="shop-price">⭐ ${item.price} Stars</div>
        ${owned
          ? `<div class="shop-owned">✓ Owned</div>`
          : ""
        }
        ${actionButton}
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-shop-buy]").forEach(button => {
    button.addEventListener("click", () => {
      buyShopItem(button.dataset.shopBuy);
    });
  });

  container.querySelectorAll("[data-shop-equip]").forEach(button => {
    button.addEventListener("click", () => {
      equipShopItem(button.dataset.shopEquip);
    });
  });
}

function buyShopItem(id) {
  const item = getShopItem(id);

  if (!item) return;

  if (state.shopOwned.includes(id)) {
    showShopMessage("You already own this item!");
    return;
  }

  if (state.stars < item.price) {
    showShopMessage(
      `Not enough Stars! You need ${item.price - state.stars} more ⭐.`
    );
    return;
  }

  state.stars -= item.price;
  state.shopOwned.push(id);

  saveState();
  updateDashboard();
  renderShop();

  showShopMessage(`You purchased ${item.name}! 🎉`);
  showToast(`Purchased ${item.name}! ⭐`);
}

function equipShopItem(id) {
  const item = getShopItem(id);

  if (!item || !state.shopOwned.includes(id)) return;

  const slot = item.category;

  if (state.shopEquipped[slot] === id) {
    state.shopEquipped[slot] = "";
    showShopMessage(`${item.name} unequipped.`);
  } else {
    state.shopEquipped[slot] = id;
    showShopMessage(`${item.name} equipped! ✨`);
  }

  saveState();
  applyShopAppearance();
  renderShop();
}

function applyShopAppearance() {
  const themeId = state.shopEquipped.theme;
  const theme = getShopItem(themeId);

  const themeBackgrounds = {
    theme_midnight: "#100b20",
    theme_cosmic: "#1b0730",
    theme_crystal: "#241044"
  };

  if (theme) {
    document.body.style.backgroundColor =
      themeBackgrounds[theme.id] || "";
  } else {
    document.body.style.backgroundColor = "";
  }

  document.body.dataset.shopTheme = theme ? theme.id : "";

  const skin = getShopItem(state.shopEquipped.skin);
  const cosmetic = getShopItem(state.shopEquipped.cosmetic);

  const profileAvatar = document.querySelector(".profile .avatar");

  if (profileAvatar) {
    profileAvatar.textContent = skin ? skin.icon : "🧑‍🎓";
    profileAvatar.style.boxShadow = cosmetic
      ? "0 0 18px #d18aff"
      : "";
    profileAvatar.title = [
      skin ? skin.name : "",
      cosmetic ? cosmetic.name : ""
    ].filter(Boolean).join(" · ");
  }
}

document.querySelectorAll("[data-shop-category]").forEach(button => {
  button.addEventListener("click", () => {
    currentShopCategory = button.dataset.shopCategory;
    renderShop();
  });
});

/* Initialize the Star Shop */
renderShop();
applyShopAppearance();

/* =============== END STAR SHOP SYSTEM =============== */





