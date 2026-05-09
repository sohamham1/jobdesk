const STORAGE_KEYS = {
  jobs: "jobs",
  contacts: "contacts",
  settings: "settings",
  lastOpenedTab: "lastOpenedTab",
};

const DEFAULT_SETTINGS = {
  name: "",
  college: "",
  linkedin: "",
  github: "",
  portfolio: "",
  other_profile: "",
  resume_primary: "",
  resume_secondary: "",
  profile_notes: "",
  experiences: [],
  education: [],
  followup_days: 5,
  notifications_enabled: true,
  templates: {
    reachout:
      "Hi {{name}} - I came across the {{role}} role at {{company}} and would love your perspective on the team. If you have a moment, I would really appreciate any advice.",
    followup1:
      "Hi {{name}} - following up on my note about the {{role}} role at {{company}}. I know things get busy, but I would be grateful for any guidance when you have a chance.",
    followup2:
      "Hi {{name}} - one last follow-up on the {{role}} opportunity at {{company}}. If a quick chat is possible, I would really appreciate it. Thanks either way.",
  },
};

const JOB_STATUSES = ["saved", "applied", "interview", "offer", "rejected"];
const JOB_STATUS_LABELS = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

const REFERRAL_STATUS_LABELS = {
  yes: "Referral Yes",
  no: "Referral No",
  asked: "Referral Asked",
  yet_to_ask: "Referral Yet to Ask",
};

const CONTACT_STAGES = [
  "1st_reachout",
  "1st_followup",
  "2nd_followup",
  "replied",
  "no_response",
  "referred",
];

const CONTACT_STAGE_LABELS = {
  "1st_reachout": "1st Reachout",
  "1st_followup": "1st Followup",
  "2nd_followup": "2nd Followup",
  replied: "Replied",
  no_response: "No Response",
  referred: "Referred",
};

const RELATIONSHIP_LABELS = {
  cold: "Cold DM",
  warm: "Warm Connection",
  alumni: "Alumni Network",
  referral: "Referral",
  event: "Met at Event",
};

const TABS = ["dashboard", "jobs", "contacts", "nudges", "settings"];
const isStandaloneApp = new URLSearchParams(window.location.search).get("mode") === "app";

const state = {
  jobs: [],
  contacts: [],
  settings: structuredClone(DEFAULT_SETTINGS),
  activeTab: isStandaloneApp ? "jobs" : "dashboard",
  jobPrimaryFilter: "all",
  moreJobFiltersOpen: false,
  jobFilter: "all",
  jobWorkflowFilter: "all",
  contactFilter: "all",
  jobSearch: "",
  contactSearch: "",
  currentPageContext: null,
  editingJobTypes: [],
  editingJobCategories: [],
  editingJobReferralContext: [],
  editingContactTypes: [],
  editingLinkedJobs: [],
};

const ui = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  document.body.classList.toggle("standalone-page", isStandaloneApp);
  document.body.classList.toggle("popup-mode", !isStandaloneApp);
  cacheDom();
  bindStaticEvents();
  await loadState();
  openInitialTab();
  renderAll();
  await detectCurrentPage();
}

function cacheDom() {
  ui.navButtons = Array.from(document.querySelectorAll(".nav-btn"));
  ui.linkTabButtons = Array.from(document.querySelectorAll("[data-tab].link-btn"));
  ui.views = TABS.reduce((acc, tab) => {
    acc[tab] = document.getElementById(`view-${tab}`);
    return acc;
  }, {});
  ui.quickCapture = document.getElementById("quick-capture");
  ui.qcIcon = document.getElementById("qc-icon");
  ui.qcTitle = document.getElementById("qc-title");
  ui.qcBtn = document.getElementById("qc-btn");
  ui.referralContactOptions = document.getElementById("referral-contact-options");
  ui.nudgeBadge = document.getElementById("nudge-badge");
  ui.navNudgeBadge = document.getElementById("nav-nudge-badge");
  ui.openAppBtn = document.getElementById("open-app-btn");

  ui.stats = {
    total: document.getElementById("stat-total"),
    applied: document.getElementById("stat-applied"),
    interview: document.getElementById("stat-interview"),
    reply: document.getElementById("stat-reply"),
  };

  ui.funnel = document.getElementById("funnel");
  ui.nudgesPreview = document.getElementById("nudges-preview");
  ui.starredPreview = document.getElementById("starred-preview");
  ui.popupLauncher = document.getElementById("popup-launcher");
  ui.launcher = {
    totalJobs: document.getElementById("launcher-total-jobs"),
    dueCount: document.getElementById("launcher-due-count"),
    needReferral: document.getElementById("launcher-need-referral"),
    dueList: document.getElementById("launcher-due-list"),
    recentJobs: document.getElementById("launcher-recent-jobs"),
    openWorkspace: document.getElementById("launcher-open-workspace-btn"),
    addJob: document.getElementById("launcher-add-job-btn"),
    addContact: document.getElementById("launcher-add-contact-btn"),
    openNudges: document.getElementById("launcher-open-nudges-btn"),
    openJobs: document.getElementById("launcher-open-jobs-btn"),
  };

  ui.jobSearch = document.getElementById("job-search");
  ui.contactSearch = document.getElementById("contact-search");
  ui.jobsSheet = document.getElementById("jobs-sheet");
  ui.jobsViewToolbar = document.getElementById("jobs-view-toolbar");
  ui.primaryJobFilterPills = Array.from(document.querySelectorAll("#primary-job-filter-pills .pill"));
  ui.moreJobFiltersBtn = document.getElementById("more-job-filters-btn");
  ui.secondaryJobFilters = document.getElementById("secondary-job-filters");
  ui.contactsList = document.getElementById("contacts-list");
  ui.nudgesList = document.getElementById("nudges-list");
  ui.nudgesDueCount = document.getElementById("nudges-due-count");

  ui.jobFilterPills = Array.from(document.querySelectorAll("#job-filter-pills .pill"));
  ui.jobWorkflowPills = Array.from(document.querySelectorAll("#job-workflow-pills .pill"));
  ui.contactFilterPills = Array.from(document.querySelectorAll("#contact-filter-pills .pill"));

  ui.addJobBtn = document.getElementById("add-job-btn");
  ui.addContactBtn = document.getElementById("add-contact-btn");
  ui.saveSettingsBtn = document.getElementById("save-settings-btn");
  ui.exportBtn = document.getElementById("export-btn");

  ui.settingName = document.getElementById("setting-name");
  ui.settingCollege = document.getElementById("setting-college");
  ui.settingLinkedin = document.getElementById("setting-linkedin");
  ui.settingGithub = document.getElementById("setting-github");
  ui.settingPortfolio = document.getElementById("setting-portfolio");
  ui.settingOtherProfile = document.getElementById("setting-other-profile");
  ui.settingResumePrimary = document.getElementById("setting-resume-primary");
  ui.settingResumeSecondary = document.getElementById("setting-resume-secondary");
  ui.settingProfileNotes = document.getElementById("setting-profile-notes");
  ui.experienceLibrary = document.getElementById("experience-library");
  ui.addExperienceBtn = document.getElementById("add-experience-btn");
  ui.educationLibrary = document.getElementById("education-library");
  ui.addEducationBtn = document.getElementById("add-education-btn");
  ui.settingDays = document.getElementById("setting-days");
  ui.settingNotifs = document.getElementById("setting-notifs");

  ui.jobModal = document.getElementById("job-modal");
  ui.jobModalTitle = document.getElementById("job-modal-title");
  ui.jobForm = {
    id: document.getElementById("job-id"),
    company: document.getElementById("job-company"),
    role: document.getElementById("job-role"),
    url: document.getElementById("job-url"),
    status: document.getElementById("job-status"),
    source: document.getElementById("job-source"),
    deadline: document.getElementById("job-deadline"),
    salary: document.getElementById("job-salary"),
    referralStatus: document.getElementById("job-referral-status"),
    referralName: document.getElementById("job-referral-name"),
    referralLink: document.getElementById("job-referral-link"),
    referralContextBox: document.getElementById("job-referral-context-tags"),
    referralContextInput: document.getElementById("job-referral-context-input"),
    notes: document.getElementById("job-notes"),
    interviewNotes: document.getElementById("job-interview-notes"),
    typeBox: document.getElementById("job-type-tags"),
    typeInput: document.getElementById("job-type-input"),
    catBox: document.getElementById("job-cat-tags"),
    catInput: document.getElementById("job-cat-input"),
    delete: document.getElementById("job-delete-btn"),
    save: document.getElementById("job-save-btn"),
  };

  ui.contactModal = document.getElementById("contact-modal");
  ui.contactModalTitle = document.getElementById("contact-modal-title");
  ui.contactForm = {
    id: document.getElementById("contact-id"),
    name: document.getElementById("contact-name"),
    platform: document.getElementById("contact-platform"),
    url: document.getElementById("contact-url"),
    role: document.getElementById("contact-role"),
    company: document.getElementById("contact-company"),
    college: document.getElementById("contact-college"),
    past: document.getElementById("contact-past"),
    relationship: document.getElementById("contact-relationship"),
    stage: document.getElementById("contact-stage"),
    typeBox: document.getElementById("contact-type-tags"),
    typeInput: document.getElementById("contact-type-input"),
    linkedJobsDisplay: document.getElementById("linked-jobs-display"),
    linkJobSelect: document.getElementById("link-job-select"),
    lastContacted: document.getElementById("contact-last-contacted"),
    notes: document.getElementById("contact-notes"),
    delete: document.getElementById("contact-delete-btn"),
    save: document.getElementById("contact-save-btn"),
  };

}

function bindStaticEvents() {
  ui.navButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });

  ui.linkTabButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });

  ui.jobFilterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      state.jobFilter = pill.dataset.filter;
      updateActivePills(ui.jobFilterPills, state.jobFilter);
      renderJobs();
    });
  });

  ui.jobWorkflowPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      state.jobWorkflowFilter = pill.dataset.workflowFilter;
      updateActiveWorkflowPills();
      renderJobs();
    });
  });
  ui.primaryJobFilterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      state.jobPrimaryFilter = pill.dataset.primaryFilter;
      updatePrimaryJobFilterPills();
      renderJobs();
    });
  });
  ui.moreJobFiltersBtn?.addEventListener("click", () => {
    state.moreJobFiltersOpen = !state.moreJobFiltersOpen;
    updateJobsViewMode();
  });

  ui.contactFilterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      state.contactFilter = pill.dataset.filter;
      updateActivePills(ui.contactFilterPills, state.contactFilter);
      renderContacts();
    });
  });

  ui.jobSearch.addEventListener("input", (event) => {
    state.jobSearch = event.target.value.trim().toLowerCase();
    renderJobs();
  });

  ui.contactSearch.addEventListener("input", (event) => {
    state.contactSearch = event.target.value.trim().toLowerCase();
    renderContacts();
  });

  ui.addJobBtn.addEventListener("click", () => openJobModal());
  ui.addContactBtn.addEventListener("click", () => openContactModal());
  ui.qcBtn.addEventListener("click", handleQuickCapture);
  ui.launcher.openWorkspace?.addEventListener("click", () => openStandaloneApp("jobs"));
  ui.launcher.addJob?.addEventListener("click", () => openJobModal());
  ui.launcher.addContact?.addEventListener("click", () => openContactModal());
  ui.launcher.openNudges?.addEventListener("click", () => openStandaloneApp("nudges"));
  ui.launcher.openJobs?.addEventListener("click", () => openStandaloneApp("jobs"));
  if (ui.openAppBtn) {
    ui.openAppBtn.classList.toggle("hidden", isStandaloneApp);
    ui.openAppBtn.addEventListener("click", () => openStandaloneApp("jobs"));
  }

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.dataset.close));
  });

  [ui.jobModal, ui.contactModal].forEach((overlay) => {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        overlay.classList.add("hidden");
      }
    });
  });

  ui.jobForm.typeInput.addEventListener("keydown", (event) => {
    handleTagInput(event, state.editingJobTypes, ui.jobForm.typeInput, ui.jobForm.typeBox);
  });
  ui.jobForm.catInput.addEventListener("keydown", (event) => {
    handleTagInput(event, state.editingJobCategories, ui.jobForm.catInput, ui.jobForm.catBox);
  });
  ui.jobForm.referralContextInput.addEventListener("keydown", (event) => {
    handleTagInput(
      event,
      state.editingJobReferralContext,
      ui.jobForm.referralContextInput,
      ui.jobForm.referralContextBox
    );
  });
  ui.contactForm.typeInput.addEventListener("keydown", (event) => {
    handleTagInput(event, state.editingContactTypes, ui.contactForm.typeInput, ui.contactForm.typeBox);
  });

  if (ui.jobsViewToolbar) {
    ui.jobsViewToolbar.classList.toggle("hidden", !isStandaloneApp);
  }
  ui.jobsSheet.addEventListener("change", async (event) => {
    const target = event.target;
    const jobId = target.dataset.jobId;
    const field = target.dataset.field;
    if (!jobId || !field) {
      return;
    }
    await updateJobFieldFromSheet(jobId, field, target.value);
  });

  ui.jobsSheet.addEventListener("blur", async (event) => {
    const target = event.target;
    const jobId = target.dataset.jobId;
    const field = target.dataset.field;
    if (!jobId || !field) {
      return;
    }
    if (target.tagName === "INPUT") {
      await updateJobFieldFromSheet(jobId, field, target.value);
    }
  }, true);

  ui.jobsSheet.addEventListener("click", async (event) => {
    const starButton = event.target.closest("[data-toggle-sheet-star]");
    if (!starButton) {
      return;
    }
    event.stopPropagation();
    const job = state.jobs.find((item) => item.id === starButton.dataset.toggleSheetStar);
    if (!job) {
      return;
    }
    job.starred = !job.starred;
    appendActivity(job, job.starred ? "Starred this job" : "Removed star");
    await persistAndRender();
  });

  ui.contactForm.linkJobSelect.addEventListener("change", () => {
    const { value } = ui.contactForm.linkJobSelect;
    if (value && !state.editingLinkedJobs.includes(value)) {
      state.editingLinkedJobs.push(value);
      renderLinkedJobsEditor();
    }
    ui.contactForm.linkJobSelect.value = "";
  });

  ui.jobForm.referralName.addEventListener("change", hydrateJobModalReferralFromSavedContact);
  ui.jobForm.referralLink.addEventListener("change", hydrateJobModalReferralFromSavedContact);
  ui.jobForm.save.addEventListener("click", saveJobFromForm);
  ui.jobForm.delete?.addEventListener("click", async () => {
    if (ui.jobForm.id.value) {
      await deleteJob(ui.jobForm.id.value);
    }
  });
  ui.contactForm.save.addEventListener("click", saveContactFromForm);
  ui.contactForm.delete?.addEventListener("click", async () => {
    if (ui.contactForm.id.value) {
      await deleteContact(ui.contactForm.id.value);
    }
  });
  ui.saveSettingsBtn.addEventListener("click", saveSettingsFromForm);
  ui.exportBtn.addEventListener("click", exportDataAsCsv);
  ui.addExperienceBtn?.addEventListener("click", () => {
    state.settings.experiences = readExperienceCards(true);
    state.settings.experiences.push(createEmptyExperience());
    renderExperienceLibrary();
  });
  ui.addEducationBtn?.addEventListener("click", () => {
    state.settings.education = readEducationCards(true);
    state.settings.education.push(createEmptyEducation());
    renderEducationLibrary();
  });

  ui.experienceLibrary?.addEventListener("click", async (event) => {
    const removeButton = event.target.closest("[data-remove-experience]");
    if (removeButton) {
      state.settings.experiences = readExperienceCards(true);
      state.settings.experiences.splice(Number(removeButton.dataset.removeExperience), 1);
      renderExperienceLibrary();
      return;
    }

    const copyButton = event.target.closest("[data-copy-experience]");
    if (copyButton) {
      const card = copyButton.closest(".library-card");
      if (!card) {
        return;
      }
      const text = formatExperienceCopy(readExperienceCard(card), copyButton.dataset.copyExperience);
      if (!text) {
        showToast("Add a few details first.");
        return;
      }
      await copyText(text, copyButton.dataset.label || "Experience copied");
    }
  });

  ui.educationLibrary?.addEventListener("click", async (event) => {
    const removeButton = event.target.closest("[data-remove-education]");
    if (removeButton) {
      state.settings.education = readEducationCards(true);
      state.settings.education.splice(Number(removeButton.dataset.removeEducation), 1);
      renderEducationLibrary();
      return;
    }

    const copyButton = event.target.closest("[data-copy-education]");
    if (copyButton) {
      const card = copyButton.closest(".library-card");
      if (!card) {
        return;
      }
      const text = formatEducationCopy(readEducationCard(card), copyButton.dataset.copyEducation);
      if (!text) {
        showToast("Add a few details first.");
        return;
      }
      await copyText(text, copyButton.dataset.label || "Education copied");
    }
  });

  ui.nudgesList.addEventListener("click", async (event) => {
    const bumpButton = event.target.closest("[data-bump-contact]");
    if (bumpButton) {
      await bumpContactStage(bumpButton.dataset.bumpContact);
      return;
    }

    const snoozeButton = event.target.closest("[data-snooze-contact]");
    if (snoozeButton) {
      await snoozeContact(snoozeButton.dataset.snoozeContact);
      return;
    }

    const copyTemplateButton = event.target.closest("[data-template-contact]");
    if (copyTemplateButton) {
      await copyOutreachTemplate(copyTemplateButton.dataset.templateContact);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal("job-modal");
      closeModal("contact-modal");
    }
  });
}

async function loadState() {
  const stored = await storageGet([
    STORAGE_KEYS.jobs,
    STORAGE_KEYS.contacts,
    STORAGE_KEYS.settings,
    STORAGE_KEYS.lastOpenedTab,
  ]);
  state.jobs = Array.isArray(stored.jobs) ? stored.jobs : [];
  state.contacts = Array.isArray(stored.contacts) ? stored.contacts : [];
  state.settings = mergeSettings(stored.settings);
  if (TABS.includes(stored.lastOpenedTab)) {
    state.activeTab = stored.lastOpenedTab;
  }
  ensureDataIntegrity();
}

function mergeSettings(settings) {
  const nextSettings = settings || {};
  return {
    ...structuredClone(DEFAULT_SETTINGS),
    ...nextSettings,
    experiences: Array.isArray(nextSettings.experiences)
      ? nextSettings.experiences.map(normalizeExperienceEntry).filter((entry) => !isExperienceEntryEmpty(entry))
      : [],
    education: Array.isArray(nextSettings.education)
      ? nextSettings.education.map(normalizeEducationEntry).filter((entry) => !isEducationEntryEmpty(entry))
      : [],
    templates: {
      ...DEFAULT_SETTINGS.templates,
      ...(nextSettings.templates || {}),
    },
  };
}

function ensureDataIntegrity() {
  state.jobs = state.jobs.map((job) => ({
    id: job.id || crypto.randomUUID(),
    company: job.company || "",
    role: job.role || "",
    url: job.url || "",
    source_site: job.source_site || "Other",
    job_type: Array.isArray(job.job_type) ? job.job_type : [],
    role_category: Array.isArray(job.role_category) ? job.role_category : [],
    status: JOB_STATUSES.includes(job.status) ? job.status : "saved",
    referral_status: ["yes", "no", "asked", "yet_to_ask"].includes(job.referral_status) ? job.referral_status : "",
    referral_name: job.referral_name || "",
    referral_profile_url: job.referral_profile_url || "",
    referral_context: Array.isArray(job.referral_context) ? job.referral_context : [],
    starred: Boolean(job.starred),
    date_added: job.date_added || new Date().toISOString(),
    deadline: job.deadline || "",
    salary_range: job.salary_range || "",
    notes: job.notes || "",
    interview_notes: job.interview_notes || "",
    activity: Array.isArray(job.activity) ? job.activity : [],
  }));

  state.contacts = state.contacts.map((contact) => ({
    id: contact.id || crypto.randomUUID(),
    name: contact.name || "",
    profile_url: contact.profile_url || "",
    platform: contact.platform || "LinkedIn",
    current_role: contact.current_role || "",
    current_company: contact.current_company || "",
    college: contact.college || "",
    past_companies: Array.isArray(contact.past_companies) ? contact.past_companies : [],
    person_type: Array.isArray(contact.person_type) ? contact.person_type : [],
    relationship: contact.relationship || "cold",
    outreach_stage: CONTACT_STAGES.includes(contact.outreach_stage)
      ? contact.outreach_stage
      : "1st_reachout",
    linked_job_ids: Array.isArray(contact.linked_job_ids) ? contact.linked_job_ids : [],
    last_contacted: contact.last_contacted || "",
    notes: contact.notes || "",
    email: contact.email || "",
  }));
}

function openInitialTab() {
  const hashTab = window.location.hash.replace("#", "");
  if (TABS.includes(hashTab)) {
    state.activeTab = hashTab;
  }
  setActiveTab(state.activeTab, false);
}

function setActiveTab(tab, persist = true) {
  if (!TABS.includes(tab)) {
    return;
  }
  state.activeTab = tab;
  if (isStandaloneApp) {
    const url = new URL(window.location.href);
    url.hash = tab;
    window.history.replaceState(null, "", url.toString());
  }
  ui.navButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  Object.entries(ui.views).forEach(([name, view]) => {
    view.classList.toggle("active", name === tab);
  });
  if (persist) {
    storageSet({ [STORAGE_KEYS.lastOpenedTab]: tab }).catch(() => {});
  }
}

function openStandaloneApp(targetTab = state.activeTab) {
  if (!chrome.tabs?.create || !chrome.runtime?.getURL) {
    return;
  }
  chrome.tabs.create({
    url: chrome.runtime.getURL(`popup.html?mode=app#${targetTab}`),
  });
}

function renderAll() {
  updateJobsViewMode();
  updatePrimaryJobFilterPills();
  updateActivePills(ui.jobFilterPills, state.jobFilter);
  updateActiveWorkflowPills();
  updateActivePills(ui.contactFilterPills, state.contactFilter);
  renderStats();
  renderFunnel();
  renderJobs();
  renderContacts();
  renderNudges();
  renderPreviews();
  renderPopupLauncher();
  renderReferralContactOptions();
  renderSettings();
  renderLinkedJobsEditor();
  updateNudgeBadges();
}

function renderStats() {
  const totalJobs = state.jobs.length;
  const appliedJobs = state.jobs.filter((job) => job.status === "applied").length;
  const interviewJobs = state.jobs.filter((job) => job.status === "interview").length;
  const totalOutreach = state.contacts.length;
  const replies = state.contacts.filter((contact) =>
    ["replied", "referred"].includes(contact.outreach_stage)
  ).length;
  const replyRate = totalOutreach ? Math.round((replies / totalOutreach) * 100) : 0;

  ui.stats.total.textContent = totalJobs;
  ui.stats.applied.textContent = appliedJobs;
  ui.stats.interview.textContent = interviewJobs;
  ui.stats.reply.textContent = `${replyRate}%`;
}

function renderFunnel() {
  const counts = {
    saved: state.jobs.filter((job) => job.status === "saved").length,
    applied: state.jobs.filter((job) => job.status === "applied").length,
    interview: state.jobs.filter((job) => job.status === "interview").length,
    offer: state.jobs.filter((job) => job.status === "offer").length,
  };
  const max = Math.max(...Object.values(counts), 1);
  const colors = {
    saved: "var(--gray)",
    applied: "var(--accent)",
    interview: "var(--green)",
    offer: "var(--amber)",
  };
  const labels = {
    saved: "Saved",
    applied: "Applied",
    interview: "Int.",
    offer: "Offer",
  };

  ui.funnel.innerHTML = Object.entries(counts)
    .map(([status, count]) => {
      const width = `${Math.max((count / max) * 100, count ? 6 : 0)}%`;
      return `
        <div class="funnel-row">
          <div class="funnel-label">${labels[status]}</div>
          <div class="funnel-bar-wrap">
            <div class="funnel-bar" style="width:${width};background:${colors[status]}"></div>
          </div>
          <div class="funnel-count">${count}</div>
        </div>
      `;
    })
    .join("");
}

function renderJobs() {
  const jobs = getFilteredJobs();
  if (!jobs.length) {
    const emptyMarkup = renderEmptyState(
      "💼",
      state.jobs.length ? "No jobs match this filter" : "No jobs saved yet",
      state.jobs.length ? "Try another filter or search term." : "Use Add or quick capture to start your pipeline."
    );
    ui.jobsSheet.innerHTML = emptyMarkup;
    return;
  }
  renderJobsSheet(jobs);
}

function renderJobsSheet(jobs) {
  ui.jobsSheet.innerHTML = `
    <div class="sheet-wrap">
      <table class="sheet-table">
        <thead>
          <tr>
            <th>#</th>
            <th>★</th>
            <th>Company</th>
            <th>Role</th>
            <th>Next action</th>
            <th>Status</th>
            <th>Referral</th>
            <th>From</th>
            <th>Profile</th>
            <th>Where From</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          ${jobs
            .map(
              (job, index) => `
                <tr class="sheet-row-${escapeHtml(job.status)}" data-edit-job="${escapeHtml(job.id)}">
                  <td class="sheet-index">${index + 1}</td>
                  <td class="sheet-star">
                    <button class="sheet-star-btn ${job.starred ? "starred" : ""}" data-toggle-sheet-star="${escapeHtml(job.id)}" title="Toggle star">${job.starred ? "★" : "☆"}</button>
                  </td>
                  <td class="sheet-cell-title">${escapeHtml(job.company)}</td>
                  <td class="sheet-cell-sub">${escapeHtml(job.role)}</td>
                  <td class="sheet-next-action">${escapeHtml(getJobNextAction(job))}</td>
                  <td>
                    <select class="sheet-input" data-job-id="${escapeHtml(job.id)}" data-field="status">
                      ${JOB_STATUSES.map(
                        (status) =>
                          `<option value="${status}" ${job.status === status ? "selected" : ""}>${JOB_STATUS_LABELS[status]}</option>`
                      ).join("")}
                    </select>
                  </td>
                  <td>
                    <select class="sheet-input" data-job-id="${escapeHtml(job.id)}" data-field="referral_status">
                      <option value="" ${job.referral_status ? "" : "selected"}>—</option>
                      <option value="yes" ${job.referral_status === "yes" ? "selected" : ""}>Yes</option>
                      <option value="no" ${job.referral_status === "no" ? "selected" : ""}>No</option>
                      <option value="asked" ${job.referral_status === "asked" ? "selected" : ""}>Asked</option>
                      <option value="yet_to_ask" ${job.referral_status === "yet_to_ask" ? "selected" : ""}>Yet to ask</option>
                    </select>
                  </td>
                  <td>
                    <input class="sheet-input" data-job-id="${escapeHtml(job.id)}" data-field="referral_name" type="text" list="referral-contact-options" value="${escapeAttribute(job.referral_name)}" placeholder="Name">
                  </td>
                  <td>
                    <input class="sheet-input" data-job-id="${escapeHtml(job.id)}" data-field="referral_profile_url" type="url" value="${escapeAttribute(job.referral_profile_url)}" placeholder="Profile URL">
                  </td>
                  <td>
                    <input class="sheet-input" data-job-id="${escapeHtml(job.id)}" data-field="referral_context" type="text" value="${escapeAttribute(job.referral_context.join(", "))}" placeholder="college, event, ex-colleague">
                  </td>
                  <td><span class="source-badge">${escapeHtml(job.source_site || "Other")}</span></td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  ui.jobsSheet.querySelectorAll("[data-edit-job]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("input, select, button, a")) {
        return;
      }
      const job = state.jobs.find((item) => item.id === row.dataset.editJob);
      if (job) {
        openJobModal(job);
      }
    });
  });
}

function renderContacts() {
  const contacts = getFilteredContacts();
  if (!contacts.length) {
    ui.contactsList.innerHTML = renderEmptyState(
      "👤",
      state.contacts.length ? "No people match this filter" : "No contacts saved yet",
      state.contacts.length
        ? "Try another stage filter or search term."
        : "Save a recruiter, founder, alum, or teammate when you find them."
    );
    return;
  }

  ui.contactsList.innerHTML = contacts
    .map((contact) => {
      const linkedJobs = contact.linked_job_ids
        .map((jobId) => state.jobs.find((job) => job.id === jobId))
        .filter(Boolean);
      const collegeLine = [contact.college, contact.past_companies.length ? `ex: ${contact.past_companies.join(", ")}` : ""]
        .filter(Boolean)
        .join(" · ");
      return `
        <article class="contact-card" data-contact-id="${escapeHtml(contact.id)}">
          <div class="contact-card-top">
            <div>
              <div class="contact-name">${escapeHtml(contact.name)}</div>
              <div class="contact-meta">${escapeHtml(
                [contact.current_role, contact.current_company].filter(Boolean).join(" · ") || "No current role yet"
              )}</div>
              ${collegeLine ? `<div class="contact-meta">${escapeHtml(collegeLine)}</div>` : ""}
            </div>
            ${renderBadge(contact.outreach_stage, CONTACT_STAGE_LABELS[contact.outreach_stage])}
          </div>
          <div class="contact-card-bottom">
            ${contact.person_type.map((type) => renderTag(type)).join("")}
            <span class="contact-jobs">${linkedJobs.length ? `Linked: ${escapeHtml(linkedJobs.map((job) => job.company).join(", "))}` : "No linked jobs yet"}</span>
            <span class="days-ago">${renderLastContactedText(contact.last_contacted)}</span>
          </div>
        </article>
      `;
    })
    .join("");

  ui.contactsList.querySelectorAll("[data-contact-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const contact = state.contacts.find((item) => item.id === card.dataset.contactId);
      if (contact) {
        openContactModal(contact);
      }
    });
  });
}

function renderNudges() {
  const dueContacts = getDueContacts();
  ui.nudgesDueCount.textContent = dueContacts.length
    ? `${dueContacts.length} ${dueContacts.length === 1 ? "follow-up" : "follow-ups"} due`
    : "Nothing due right now";

  if (!dueContacts.length) {
    ui.nudgesList.innerHTML = renderEmptyState(
      "🔕",
      "Your queue is clear",
      "When contacts go quiet past your follow-up window, they’ll show up here."
    );
    return;
  }

  ui.nudgesList.innerHTML = dueContacts
    .map(({ contact, daysOverdue, linkedJobs }) => {
      const urgencyClass = daysOverdue >= state.settings.followup_days * 2 ? "urgent" : daysOverdue > state.settings.followup_days ? "soon" : "";
      const linkedJob = linkedJobs[0];
      return `
        <article class="nudge-card ${urgencyClass}">
          <div class="nudge-info">
            <div class="nudge-name">${escapeHtml(contact.name)} · ${escapeHtml(CONTACT_STAGE_LABELS[contact.outreach_stage])}</div>
            <div class="nudge-detail">
              ${escapeHtml(
                [linkedJob ? `${linkedJob.company} ${linkedJob.role}` : "", renderLastContactedText(contact.last_contacted)]
                  .filter(Boolean)
                  .join(" · ")
              )}
            </div>
          </div>
          <div class="nudge-action">
            <button class="btn-stage" data-template-contact="${escapeHtml(contact.id)}">Copy msg</button>
            <button class="btn-stage" data-bump-contact="${escapeHtml(contact.id)}">Bump stage</button>
            <button class="btn-stage" data-snooze-contact="${escapeHtml(contact.id)}">Skip</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPreviews() {
  const dueContacts = getDueContacts().slice(0, 3);
  ui.nudgesPreview.innerHTML = dueContacts.length
    ? dueContacts
        .map(
          ({ contact, daysOverdue }) => `
            <div class="contact-mini">
              <div>
                <div class="contact-mini-name">${escapeHtml(contact.name)}</div>
                <div class="contact-mini-meta">${escapeHtml(CONTACT_STAGE_LABELS[contact.outreach_stage])} · ${daysOverdue}d overdue</div>
              </div>
              ${renderBadge(contact.outreach_stage, CONTACT_STAGE_LABELS[contact.outreach_stage])}
            </div>
          `
        )
        .join("")
    : `<div class="empty-hint">No follow-ups due 🎉</div>`;

  const starredJobs = state.jobs.filter((job) => job.starred).slice(0, 3);
  ui.starredPreview.innerHTML = starredJobs.length
    ? starredJobs
        .map(
          (job) => `
            <div class="contact-mini">
              <div>
                <div class="contact-mini-name">${escapeHtml(job.company)}</div>
                <div class="contact-mini-meta">${escapeHtml(job.role)}</div>
              </div>
              ${renderBadge(job.status, JOB_STATUS_LABELS[job.status])}
            </div>
          `
        )
        .join("")
    : `<div class="empty-hint">No starred jobs yet</div>`;
}

function renderPopupLauncher() {
  if (isStandaloneApp || !ui.popupLauncher) {
    return;
  }

  const dueContacts = getDueContacts().slice(0, 3);
  const needReferralJobs = state.jobs.filter((job) => needsReferral(job)).length;
  ui.launcher.totalJobs.textContent = String(state.jobs.length);
  ui.launcher.dueCount.textContent = String(getDueContacts().length);
  ui.launcher.needReferral.textContent = String(needReferralJobs);

  ui.launcher.dueList.innerHTML = dueContacts.length
    ? dueContacts
        .map(
          ({ contact, linkedJobs, daysOverdue }) => `
            <div class="launcher-item">
              <div class="launcher-item-main">
                <div class="launcher-item-title">${escapeHtml(contact.name)}</div>
                <div class="launcher-item-sub">${escapeHtml(
                  [linkedJobs[0]?.company || "", `${daysOverdue}d overdue`].filter(Boolean).join(" · ")
                )}</div>
              </div>
              ${renderBadge(contact.outreach_stage, CONTACT_STAGE_LABELS[contact.outreach_stage])}
            </div>
          `
        )
        .join("")
    : `<div class="empty-hint">No follow-ups due 🎉</div>`;

  const recentJobs = state.jobs.slice(0, 3);
  ui.launcher.recentJobs.innerHTML = recentJobs.length
    ? recentJobs
        .map(
          (job) => `
            <div class="launcher-item">
              <div class="launcher-item-main">
                <div class="launcher-item-title">${escapeHtml(job.company)}</div>
                <div class="launcher-item-sub">${escapeHtml(getJobNextAction(job))}</div>
              </div>
              ${renderBadge(job.status, JOB_STATUS_LABELS[job.status])}
            </div>
          `
        )
        .join("")
    : `<div class="empty-hint">No jobs saved yet</div>`;
}

function renderSettings() {
  ui.settingName.value = state.settings.name || "";
  ui.settingCollege.value = state.settings.college || "";
  ui.settingLinkedin.value = state.settings.linkedin || "";
  ui.settingGithub.value = state.settings.github || "";
  ui.settingPortfolio.value = state.settings.portfolio || "";
  ui.settingOtherProfile.value = state.settings.other_profile || "";
  ui.settingResumePrimary.value = state.settings.resume_primary || "";
  ui.settingResumeSecondary.value = state.settings.resume_secondary || "";
  ui.settingProfileNotes.value = state.settings.profile_notes || "";
  renderExperienceLibrary();
  renderEducationLibrary();
  ui.settingDays.value = String(state.settings.followup_days || DEFAULT_SETTINGS.followup_days);
  ui.settingNotifs.checked = Boolean(state.settings.notifications_enabled);
}

function renderReferralContactOptions() {
  if (!ui.referralContactOptions) {
    return;
  }

  ui.referralContactOptions.innerHTML = state.contacts
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((contact) => {
      const descriptor = [contact.current_company, contact.current_role].filter(Boolean).join(" · ");
      return `<option value="${escapeAttribute(contact.name)}"${descriptor ? ` label="${escapeAttribute(descriptor)}"` : ""}></option>`;
    })
    .join("");
}

function renderExperienceLibrary() {
  if (!ui.experienceLibrary) {
    return;
  }

  const entries = Array.isArray(state.settings.experiences) ? state.settings.experiences : [];
  if (!entries.length) {
    ui.experienceLibrary.innerHTML = `
      <div class="library-empty">
        <div class="library-empty-title">No experiences added yet</div>
        <div class="library-empty-sub">Add internships, jobs, projects, or campus roles you often reuse in applications.</div>
      </div>
    `;
    return;
  }

  ui.experienceLibrary.innerHTML = entries
    .map(
      (entry, index) => `
        <div class="library-card" data-experience-index="${index}">
          <div class="library-card-head">
            <div>
              <div class="library-card-title">${escapeHtml(entry.title || `Experience ${index + 1}`)}</div>
              <div class="library-card-sub">${escapeHtml(entry.company || "Add company and role details")}</div>
            </div>
            <div class="library-card-actions">
              <button class="btn-stage" type="button" data-copy-experience="summary" data-label="Summary copied">Copy summary</button>
              <button class="btn-stage" type="button" data-copy-experience="bullets" data-label="Bullets copied">Copy bullets</button>
              <button class="btn-stage" type="button" data-copy-experience="all" data-label="Experience copied">Copy all</button>
              <button class="btn-stage btn-stage-danger" type="button" data-remove-experience="${index}">Remove</button>
            </div>
          </div>
          <div class="form-2col">
            <div class="form-group">
              <label>Company</label>
              <input type="text" data-field="company" value="${escapeAttribute(entry.company)}" placeholder="e.g. Google">
            </div>
            <div class="form-group">
              <label>Role / Title</label>
              <input type="text" data-field="title" value="${escapeAttribute(entry.title)}" placeholder="e.g. Product Intern">
            </div>
          </div>
          <div class="form-3col">
            <div class="form-group">
              <label>Location</label>
              <input type="text" data-field="location" value="${escapeAttribute(entry.location)}" placeholder="e.g. Bengaluru / Remote">
            </div>
            <div class="form-group">
              <label>Start</label>
              <input type="text" data-field="start_date" value="${escapeAttribute(entry.start_date)}" placeholder="May 2025">
            </div>
            <div class="form-group">
              <label>End</label>
              <input type="text" data-field="end_date" value="${escapeAttribute(entry.end_date)}" placeholder="Jul 2025">
            </div>
          </div>
          <div class="form-group">
            <label>Short Summary</label>
            <textarea rows="2" data-field="summary" placeholder="A crisp 1-2 line description you can paste into application forms.">${escapeHtml(entry.summary)}</textarea>
          </div>
          <div class="form-group">
            <label>Impact Bullets</label>
            <textarea rows="5" data-field="bullets" placeholder="One bullet per line&#10;Built...&#10;Shipped...&#10;Improved...">${escapeHtml(entry.bullets)}</textarea>
          </div>
        </div>
      `
    )
    .join("");
}

function renderEducationLibrary() {
  if (!ui.educationLibrary) {
    return;
  }

  const entries = Array.isArray(state.settings.education) ? state.settings.education : [];
  if (!entries.length) {
    ui.educationLibrary.innerHTML = `
      <div class="library-empty">
        <div class="library-empty-title">No education entries added yet</div>
        <div class="library-empty-sub">Store degree details, awards, clubs, and coursework you repeatedly fill in.</div>
      </div>
    `;
    return;
  }

  ui.educationLibrary.innerHTML = entries
    .map(
      (entry, index) => `
        <div class="library-card" data-education-index="${index}">
          <div class="library-card-head">
            <div>
              <div class="library-card-title">${escapeHtml(entry.institution || `Education ${index + 1}`)}</div>
              <div class="library-card-sub">${escapeHtml(entry.degree || "Add institution and program details")}</div>
            </div>
            <div class="library-card-actions">
              <button class="btn-stage" type="button" data-copy-education="details" data-label="Education details copied">Copy details</button>
              <button class="btn-stage" type="button" data-copy-education="all" data-label="Education copied">Copy all</button>
              <button class="btn-stage btn-stage-danger" type="button" data-remove-education="${index}">Remove</button>
            </div>
          </div>
          <div class="form-2col">
            <div class="form-group">
              <label>Institution</label>
              <input type="text" data-field="institution" value="${escapeAttribute(entry.institution)}" placeholder="e.g. IIT Bombay">
            </div>
            <div class="form-group">
              <label>Degree</label>
              <input type="text" data-field="degree" value="${escapeAttribute(entry.degree)}" placeholder="e.g. B.Tech">
            </div>
          </div>
          <div class="form-3col">
            <div class="form-group">
              <label>Field</label>
              <input type="text" data-field="field" value="${escapeAttribute(entry.field)}" placeholder="e.g. Computer Science">
            </div>
            <div class="form-group">
              <label>Start</label>
              <input type="text" data-field="start_date" value="${escapeAttribute(entry.start_date)}" placeholder="2022">
            </div>
            <div class="form-group">
              <label>End</label>
              <input type="text" data-field="end_date" value="${escapeAttribute(entry.end_date)}" placeholder="2026">
            </div>
          </div>
          <div class="form-2col">
            <div class="form-group">
              <label>Location</label>
              <input type="text" data-field="location" value="${escapeAttribute(entry.location)}" placeholder="e.g. Mumbai">
            </div>
            <div class="form-group">
              <label>Grade / CGPA</label>
              <input type="text" data-field="grade" value="${escapeAttribute(entry.grade)}" placeholder="e.g. 8.7 / 10">
            </div>
          </div>
          <div class="form-group">
            <label>Coursework / Achievements / Activities</label>
            <textarea rows="4" data-field="details" placeholder="Relevant coursework, leadership positions, awards, clubs, scholarships...">${escapeHtml(entry.details)}</textarea>
          </div>
        </div>
      `
    )
    .join("");
}

function renderLinkedJobsEditor() {
  ui.contactForm.linkJobSelect.innerHTML = [
    '<option value="">Link to a job…</option>',
    ...state.jobs
      .filter((job) => !state.editingLinkedJobs.includes(job.id))
      .map((job) => `<option value="${escapeHtml(job.id)}">${escapeHtml(job.company)} — ${escapeHtml(job.role)}</option>`),
  ].join("");

  if (!state.editingLinkedJobs.length) {
    ui.contactForm.linkedJobsDisplay.innerHTML = '<div class="empty-hint">No jobs linked yet</div>';
    return;
  }

  ui.contactForm.linkedJobsDisplay.innerHTML = state.editingLinkedJobs
    .map((jobId) => state.jobs.find((job) => job.id === jobId))
    .filter(Boolean)
    .map(
      (job) => `
        <span class="tag">
          ${escapeHtml(job.company)} — ${escapeHtml(job.role)}
          <span class="tag-x" data-remove-linked-job="${escapeHtml(job.id)}">×</span>
        </span>
      `
    )
    .join("");

  ui.contactForm.linkedJobsDisplay.querySelectorAll("[data-remove-linked-job]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editingLinkedJobs = state.editingLinkedJobs.filter((jobId) => jobId !== button.dataset.removeLinkedJob);
      renderLinkedJobsEditor();
    });
  });
}

function updateNudgeBadges() {
  const count = getDueContacts().length;
  ui.nudgeBadge.textContent = String(count);
  ui.navNudgeBadge.textContent = String(count);
  ui.nudgeBadge.classList.toggle("hidden", count === 0);
  ui.navNudgeBadge.classList.toggle("hidden", count === 0);
}

async function detectCurrentPage() {
  if (!chrome.tabs?.query || !chrome.tabs?.sendMessage) {
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url || tab.url.startsWith("chrome://")) {
      hideQuickCapture();
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "JOBDESK_SCRAPE_PAGE",
      settings: { college: state.settings.college },
      savedJobs: state.jobs.map((job) => ({
        id: job.id,
        company: job.company,
        role: job.role,
        url: job.url,
      })),
      savedContacts: state.contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        profile_url: contact.profile_url,
      })),
    });

    if (response?.kind === "job" || response?.kind === "contact") {
      state.currentPageContext = response;
      showQuickCapture(response);
    } else {
      hideQuickCapture();
    }
  } catch (error) {
    hideQuickCapture();
  }
}

function showQuickCapture(context) {
  ui.quickCapture.classList.remove("hidden");
  ui.qcIcon.textContent = context.kind === "job" ? "💼" : "👤";
  ui.qcTitle.textContent = context.title;
  ui.qcBtn.textContent = isStandaloneApp ? "Review" : "Save Now";
}

function hideQuickCapture() {
  state.currentPageContext = null;
  ui.quickCapture.classList.add("hidden");
}

async function handleQuickCapture() {
  if (!state.currentPageContext) {
    return;
  }
  if (!isStandaloneApp) {
    await saveCurrentPageContextDirectly();
    return;
  }
  if (state.currentPageContext.kind === "job") {
    openJobModal(null, state.currentPageContext.data);
  } else if (state.currentPageContext.kind === "contact") {
    openContactModal(null, state.currentPageContext.data);
  }
}

function openJobModal(job = null, prefill = null) {
  const source = prefill || job || {};
  ui.jobModalTitle.textContent = job ? "Edit Job" : "Add Job";
  ui.jobForm.delete?.classList.toggle("hidden", !job);
  ui.jobForm.id.value = job?.id || "";
  ui.jobForm.company.value = source.company || "";
  ui.jobForm.role.value = source.role || "";
  ui.jobForm.url.value = source.url || "";
  ui.jobForm.status.value = job?.status || "saved";
  ui.jobForm.source.value = source.source_site || "Other";
  ui.jobForm.deadline.value = job?.deadline || "";
  ui.jobForm.salary.value = source.salary_range || job?.salary_range || "";
  ui.jobForm.referralStatus.value = job?.referral_status || "";
  ui.jobForm.referralName.value = job?.referral_name || "";
  ui.jobForm.referralLink.value = job?.referral_profile_url || "";
  ui.jobForm.notes.value = job?.notes || "";
  ui.jobForm.interviewNotes.value = job?.interview_notes || "";
  state.editingJobTypes = [...(source.job_type || job?.job_type || [])];
  state.editingJobCategories = [...(source.role_category || job?.role_category || [])];
  state.editingJobReferralContext = [...(job?.referral_context || [])];
  renderJobTypeTags();
  renderJobCategoryTags();
  renderJobReferralContextTags();
  ui.jobForm.typeInput.value = "";
  ui.jobForm.catInput.value = "";
  ui.jobForm.referralContextInput.value = "";
  ui.jobModal.classList.remove("hidden");
}

function openContactModal(contact = null, prefill = null) {
  const source = prefill || contact || {};
  ui.contactModalTitle.textContent = contact ? "Edit Person" : "Add Person";
  ui.contactForm.delete?.classList.toggle("hidden", !contact);
  ui.contactForm.id.value = contact?.id || "";
  ui.contactForm.name.value = source.name || "";
  ui.contactForm.platform.value = source.platform || "LinkedIn";
  ui.contactForm.url.value = source.profile_url || "";
  ui.contactForm.role.value = source.current_role || "";
  ui.contactForm.company.value = source.current_company || "";
  ui.contactForm.college.value = source.college || "";
  ui.contactForm.past.value = (source.past_companies || []).join(", ");
  ui.contactForm.relationship.value = contact?.relationship || "cold";
  ui.contactForm.stage.value = contact?.outreach_stage || "1st_reachout";
  ui.contactForm.lastContacted.value = contact?.last_contacted || source.last_contacted || "";
  ui.contactForm.notes.value = contact?.notes || "";
  state.editingContactTypes = [...(source.person_type || contact?.person_type || [])];
  state.editingLinkedJobs = [...(contact?.linked_job_ids || [])];
  renderContactTypeTags();
  renderLinkedJobsEditor();
  ui.contactForm.typeInput.value = "";
  ui.contactModal.classList.remove("hidden");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("hidden");
  }
}

async function saveJobFromForm() {
  const id = ui.jobForm.id.value;
  const company = ui.jobForm.company.value.trim();
  const role = ui.jobForm.role.value.trim();
  const url = ui.jobForm.url.value.trim();
  const existing = id ? state.jobs.find((job) => job.id === id) : null;

  if (!company || !role) {
    showToast("Company and role are required.");
    return;
  }

  const duplicate = state.jobs.find((job) => job.url && job.url === url && job.id !== id);
  if (duplicate && !window.confirm(`You already saved ${duplicate.role} at ${duplicate.company}. Save this anyway?`)) {
    return;
  }

  const nextJob = {
    id: id || crypto.randomUUID(),
    company,
    role,
    url,
    source_site: ui.jobForm.source.value,
    job_type: [...new Set(state.editingJobTypes)],
    role_category: [...new Set(state.editingJobCategories)],
    status: ui.jobForm.status.value,
    referral_status: ui.jobForm.referralStatus.value,
    referral_name: ui.jobForm.referralName.value.trim(),
    referral_profile_url: ui.jobForm.referralLink.value.trim(),
    referral_context: [...new Set(state.editingJobReferralContext)],
    starred: existing?.starred || false,
    date_added: existing?.date_added || new Date().toISOString(),
    deadline: ui.jobForm.deadline.value,
    salary_range: ui.jobForm.salary.value.trim(),
    notes: ui.jobForm.notes.value.trim(),
    interview_notes: ui.jobForm.interviewNotes.value.trim(),
    activity: existing?.activity ? [...existing.activity] : [],
  };
  hydrateReferralJobWithSavedContact(nextJob);

  if (!existing) {
    appendActivity(nextJob, "Job saved");
    state.jobs.unshift(nextJob);
    syncReferralContactForJob(nextJob);
  } else {
    if (existing.status !== nextJob.status) {
      appendActivity(nextJob, `Status moved to ${JOB_STATUS_LABELS[nextJob.status]}`);
    }
    if (existing.referral_status !== nextJob.referral_status) {
      appendActivity(
        nextJob,
        nextJob.referral_status
          ? `Referral status set to ${REFERRAL_STATUS_LABELS[nextJob.referral_status]}`
          : "Cleared referral status"
      );
    }
    Object.assign(existing, nextJob);
    syncReferralContactForJob(existing);
  }

  closeModal("job-modal");
  await persistAndRender();
  showToast(existing ? "Job updated." : "Job saved.");
}

async function saveContactFromForm() {
  const id = ui.contactForm.id.value;
  const name = ui.contactForm.name.value.trim();
  const profileUrl = ui.contactForm.url.value.trim();
  const existing = id ? state.contacts.find((contact) => contact.id === id) : null;

  if (!name) {
    showToast("Name is required.");
    return;
  }

  const duplicate = state.contacts.find(
    (contact) => contact.profile_url && contact.profile_url === profileUrl && contact.id !== id
  );
  if (duplicate && !window.confirm(`You already saved ${duplicate.name}. Save this anyway?`)) {
    return;
  }

  const nextStage = ui.contactForm.stage.value;
  const nextLastContacted = ui.contactForm.lastContacted.value;

  const nextContact = {
    id: id || crypto.randomUUID(),
    name,
    profile_url: profileUrl,
    platform: ui.contactForm.platform.value,
    current_role: ui.contactForm.role.value.trim(),
    current_company: ui.contactForm.company.value.trim(),
    college: ui.contactForm.college.value.trim(),
    past_companies: splitCommaValues(ui.contactForm.past.value),
    person_type: derivePersonTypes([
      ...state.editingContactTypes,
      ...detectSavedCompanyPersonTypes(ui.contactForm.company.value.trim(), ui.contactForm.college.value.trim()),
    ]),
    relationship: ui.contactForm.relationship.value,
    outreach_stage: nextStage,
    linked_job_ids: [...new Set(state.editingLinkedJobs)],
    last_contacted: nextLastContacted,
    notes: ui.contactForm.notes.value.trim(),
    email: existing?.email || "",
  };

  if (!existing) {
    state.contacts.unshift(nextContact);
    logLinkedJobsForContact(nextContact, []);
  } else {
    logLinkedJobsForContact(nextContact, existing.linked_job_ids);
    if (existing.outreach_stage !== nextContact.outreach_stage) {
      appendActivityToLinkedJobs(
        nextContact,
        `${nextContact.name} moved to ${CONTACT_STAGE_LABELS[nextContact.outreach_stage]}`
      );
    }
    if (existing.last_contacted !== nextContact.last_contacted && nextContact.last_contacted) {
      appendActivityToLinkedJobs(
        nextContact,
        `Last contacted ${nextContact.name} on ${nextContact.last_contacted}`
      );
    }
    Object.assign(existing, nextContact);
  }

  closeModal("contact-modal");
  await persistAndRender();
  showToast(existing ? "Person updated." : "Person saved.");
}

async function deleteJob(jobId) {
  const job = state.jobs.find((item) => item.id === jobId);
  if (!job) {
    return;
  }
  if (!window.confirm(`Delete ${job.role} at ${job.company}?`)) {
    return;
  }

  state.jobs = state.jobs.filter((item) => item.id !== jobId);
  state.contacts = state.contacts.map((contact) => ({
    ...contact,
    linked_job_ids: contact.linked_job_ids.filter((linkedJobId) => linkedJobId !== jobId),
  }));
  closeModal("job-modal");
  await persistAndRender();
  showToast("Job removed.");
}

async function deleteContact(contactId) {
  const contact = state.contacts.find((item) => item.id === contactId);
  if (!contact) {
    return;
  }
  if (!window.confirm(`Delete ${contact.name} from People?`)) {
    return;
  }

  state.contacts = state.contacts.filter((item) => item.id !== contactId);
  closeModal("contact-modal");
  await persistAndRender();
  showToast("Person removed.");
}

async function saveSettingsFromForm() {
  state.settings = mergeSettings({
    ...state.settings,
    name: ui.settingName.value.trim(),
    college: ui.settingCollege.value.trim(),
    linkedin: ui.settingLinkedin.value.trim(),
    github: ui.settingGithub.value.trim(),
    portfolio: ui.settingPortfolio.value.trim(),
    other_profile: ui.settingOtherProfile.value.trim(),
    resume_primary: ui.settingResumePrimary.value.trim(),
    resume_secondary: ui.settingResumeSecondary.value.trim(),
    profile_notes: ui.settingProfileNotes.value.trim(),
    experiences: readExperienceCards(false),
    education: readEducationCards(false),
    followup_days: clampNumber(ui.settingDays.value, 1, 30, DEFAULT_SETTINGS.followup_days),
    notifications_enabled: ui.settingNotifs.checked,
  });
  await persistAndRender();
  await detectCurrentPage();
  showToast("Settings saved.");
}

async function saveCurrentPageContextDirectly() {
  if (!state.currentPageContext || !chrome.runtime?.sendMessage) {
    return;
  }
  const response = await chrome.runtime.sendMessage({
    type: "JOBDESK_SAVE_CAPTURED_ENTITY",
    payload: state.currentPageContext,
  });
  if (!response?.ok) {
    showToast(response?.error || "Could not save this page.");
    return;
  }
  await loadState();
  renderAll();
  notifyBackground();
  showToast(response.message || "Saved.");
}

async function persistAndRender() {
  await storageSet({
    [STORAGE_KEYS.jobs]: state.jobs,
    [STORAGE_KEYS.contacts]: state.contacts,
    [STORAGE_KEYS.settings]: state.settings,
  });
  renderAll();
  notifyBackground();
}

function notifyBackground() {
  if (!chrome.runtime?.sendMessage) {
    return;
  }
  chrome.runtime.sendMessage({ type: "JOBDESK_DATA_UPDATED" }).catch(() => {});
}

function getFilteredJobs() {
  return state.jobs.filter((job) => {
    const primaryMatch = matchesPrimaryJobFilter(job, state.jobPrimaryFilter);
    const statusMatch = state.jobFilter === "all" || job.status === state.jobFilter;
    const workflowMatch = matchesWorkflowFilter(job, state.jobWorkflowFilter);
    const haystack = [
      job.company,
      job.role,
      job.source_site,
      job.notes,
      job.referral_status,
      job.referral_name,
      job.referral_profile_url,
      ...job.referral_context,
      ...job.job_type,
      ...job.role_category,
    ]
      .join(" ")
      .toLowerCase();
    const searchMatch = !state.jobSearch || haystack.includes(state.jobSearch);
    return primaryMatch && statusMatch && workflowMatch && searchMatch;
  });
}

function getFilteredContacts() {
  return state.contacts.filter((contact) => {
    const stageMatch = state.contactFilter === "all" || contact.outreach_stage === state.contactFilter;
    const linkedCompanies = contact.linked_job_ids
      .map((jobId) => state.jobs.find((job) => job.id === jobId)?.company)
      .filter(Boolean);
    const haystack = [
      contact.name,
      contact.current_role,
      contact.current_company,
      contact.college,
      contact.notes,
      ...contact.person_type,
      ...contact.past_companies,
      ...linkedCompanies,
    ]
      .join(" ")
      .toLowerCase();
    const searchMatch = !state.contactSearch || haystack.includes(state.contactSearch);
    return stageMatch && searchMatch;
  });
}

function getContactsForJob(jobId) {
  return state.contacts.filter((contact) => contact.linked_job_ids.includes(jobId));
}

function getDueContacts() {
  const threshold = state.settings.followup_days || DEFAULT_SETTINGS.followup_days;
  return state.contacts
    .filter((contact) => {
      if (["replied", "referred", "no_response"].includes(contact.outreach_stage)) {
        return false;
      }
      if (!contact.last_contacted) {
        return false;
      }
      const daysSince = diffInDays(contact.last_contacted, todayDate());
      return daysSince >= threshold;
    })
    .map((contact) => ({
      contact,
      daysOverdue: diffInDays(contact.last_contacted, todayDate()),
      linkedJobs: contact.linked_job_ids
        .map((jobId) => state.jobs.find((job) => job.id === jobId))
        .filter(Boolean),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

function getDueContactsForJob(jobId) {
  return getDueContacts().filter(({ contact }) => contact.linked_job_ids.includes(jobId));
}

function needsReferral(job) {
  return !job.referral_status || job.referral_status === "yet_to_ask";
}

function wasAppliedThisWeek(job) {
  if (job.status !== "applied") {
    return false;
  }
  const recentAppliedEvent = (job.activity || [])
    .slice()
    .reverse()
    .find((item) => /applied/i.test(item.message));
  const dateToCheck = recentAppliedEvent?.at || job.date_added;
  return diffInDays(formatLocalDate(new Date(dateToCheck)), todayDate()) <= 7;
}

function hasNoStatusUpdate(job) {
  const lastActivity = (job.activity || []).slice().reverse()[0]?.at || job.date_added;
  return ["saved", "applied"].includes(job.status) && diffInDays(formatLocalDate(new Date(lastActivity)), todayDate()) > 7;
}

function matchesWorkflowFilter(job, filter) {
  switch (filter) {
    case "need_referral":
      return needsReferral(job);
    case "yet_to_ask":
      return job.referral_status === "yet_to_ask";
    case "referral_asked":
      return job.referral_status === "asked";
    case "applied_week":
      return wasAppliedThisWeek(job);
    case "need_followup":
      return getDueContactsForJob(job.id).length > 0;
    case "no_status_update":
      return hasNoStatusUpdate(job);
    case "starred":
      return job.starred;
    default:
      return true;
  }
}

function matchesPrimaryJobFilter(job, filter) {
  switch (filter) {
    case "active":
      return job.status !== "rejected";
    case "need_referral":
      return needsReferral(job);
    case "need_followup":
      return getDueContactsForJob(job.id).length > 0;
    case "starred":
      return job.starred;
    default:
      return true;
  }
}

function getJobNextAction(job) {
  if (job.status === "offer") {
    return "Review offer and decide next steps";
  }
  if (job.status === "interview") {
    return "Prep interviews and keep notes tight";
  }
  if (job.status === "rejected") {
    return "Archive learnings and move on";
  }
  if (job.referral_status === "yet_to_ask") {
    return "Ask for a referral";
  }
  if (job.referral_status === "asked") {
    return "Follow up on referral ask";
  }
  if (getDueContactsForJob(job.id).length > 0) {
    return "Follow up with your contact";
  }
  if (job.status === "saved") {
    return job.referral_status === "no" ? "Apply when ready" : "Decide if you have a warm path";
  }
  if (job.status === "applied") {
    return "Track response and keep momentum";
  }
  return "Review and update this opportunity";
}

async function bumpContactStage(contactId) {
  const contact = state.contacts.find((item) => item.id === contactId);
  if (!contact) {
    return;
  }
  const nextStage = {
    "1st_reachout": "1st_followup",
    "1st_followup": "2nd_followup",
    "2nd_followup": "no_response",
  }[contact.outreach_stage];

  if (!nextStage) {
    showToast("This contact is already at a final stage.");
    return;
  }

  contact.outreach_stage = nextStage;
  contact.last_contacted = todayDate();
  appendActivityToLinkedJobs(
    contact,
    `Outreach stage moved to ${CONTACT_STAGE_LABELS[nextStage]} for ${contact.name}`
  );
  await persistAndRender();
  showToast(`Moved ${contact.name} to ${CONTACT_STAGE_LABELS[nextStage]}.`);
}

async function snoozeContact(contactId) {
  const contact = state.contacts.find((item) => item.id === contactId);
  if (!contact) {
    return;
  }
  contact.last_contacted = todayDate();
  await persistAndRender();
  showToast(`Snoozed ${contact.name} for now.`);
}

async function copyOutreachTemplate(contactId) {
  const contact = state.contacts.find((item) => item.id === contactId);
  if (!contact) {
    return;
  }
  const linkedJob = state.jobs.find((job) => contact.linked_job_ids.includes(job.id));
  const templateKey =
    contact.outreach_stage === "1st_reachout"
      ? "reachout"
      : contact.outreach_stage === "1st_followup"
      ? "followup1"
      : "followup2";
  const message = interpolateTemplate(state.settings.templates[templateKey], {
    name: contact.name || "there",
    company: linkedJob?.company || contact.current_company || "your team",
    role: linkedJob?.role || "the role",
  });
  await copyText(message, "Message copied");
}

function derivePersonTypes(types) {
  return [...new Set(types.map((type) => type.trim()).filter(Boolean))];
}

function detectSavedCompanyPersonTypes(company, college) {
  const types = [];
  if (company && state.jobs.some((job) => normalize(job.company) === normalize(company))) {
    types.push("Employee");
  }
  if (college && state.settings.college && normalize(college) === normalize(state.settings.college)) {
    types.push("Alumni");
  }
  return types;
}

function logLinkedJobsForContact(contact, previousJobIds = [], customMessage = null) {
  const previousSet = new Set(previousJobIds);
  contact.linked_job_ids.forEach((jobId) => {
    if (!previousSet.has(jobId)) {
      const job = state.jobs.find((item) => item.id === jobId);
      if (job) {
        appendActivity(job, customMessage || `Linked contact ${contact.name}`);
      }
    }
  });
}

function appendActivityToLinkedJobs(contact, message) {
  contact.linked_job_ids.forEach((jobId) => {
    const job = state.jobs.find((item) => item.id === jobId);
    if (job) {
      appendActivity(job, message);
    }
  });
}

function appendActivity(job, message) {
  job.activity = Array.isArray(job.activity) ? job.activity : [];
  job.activity.push({
    at: new Date().toISOString(),
    message,
  });
}

function handleTagInput(event, collection, input, targetBox) {
  if (event.key !== "Enter") {
    return;
  }
  event.preventDefault();
  const value = input.value.trim();
  if (!value) {
    return;
  }
  if (!collection.includes(value)) {
    collection.push(value);
  }
  input.value = "";
  if (targetBox === ui.jobForm.typeBox) {
    renderJobTypeTags();
  } else if (targetBox === ui.jobForm.catBox) {
    renderJobCategoryTags();
  } else if (targetBox === ui.jobForm.referralContextBox) {
    renderJobReferralContextTags();
  } else if (targetBox === ui.contactForm.typeBox) {
    renderContactTypeTags();
  }
}

function renderEditableTags(tags, container, onRemove) {
  container.innerHTML = tags.length
    ? tags.map((tag) => `<span class="tag">${escapeHtml(tag)} <span class="tag-x" data-tag="${escapeHtml(tag)}">×</span></span>`).join("")
    : '<div class="empty-hint">No tags yet</div>';
  container.querySelectorAll("[data-tag]").forEach((button) => {
    button.addEventListener("click", () => onRemove(button.dataset.tag));
  });
}

function renderJobTypeTags() {
  renderEditableTags(state.editingJobTypes, ui.jobForm.typeBox, (tag) => {
    state.editingJobTypes = state.editingJobTypes.filter((item) => item !== tag);
    renderJobTypeTags();
  });
}

function renderJobCategoryTags() {
  renderEditableTags(state.editingJobCategories, ui.jobForm.catBox, (tag) => {
    state.editingJobCategories = state.editingJobCategories.filter((item) => item !== tag);
    renderJobCategoryTags();
  });
}

function renderContactTypeTags() {
  renderEditableTags(state.editingContactTypes, ui.contactForm.typeBox, (tag) => {
    state.editingContactTypes = state.editingContactTypes.filter((item) => item !== tag);
    renderContactTypeTags();
  });
}

function renderJobReferralContextTags() {
  renderEditableTags(state.editingJobReferralContext, ui.jobForm.referralContextBox, (tag) => {
    state.editingJobReferralContext = state.editingJobReferralContext.filter((item) => item !== tag);
    renderJobReferralContextTags();
  });
}

function updateActivePills(pills, filter) {
  pills.forEach((pill) => pill.classList.toggle("active", pill.dataset.filter === filter));
}

function updatePrimaryJobFilterPills() {
  ui.primaryJobFilterPills.forEach((pill) =>
    pill.classList.toggle("active", pill.dataset.primaryFilter === state.jobPrimaryFilter)
  );
}

function updateActiveWorkflowPills() {
  ui.jobWorkflowPills.forEach((pill) =>
    pill.classList.toggle("active", pill.dataset.workflowFilter === state.jobWorkflowFilter)
  );
}

function renderBadge(type, label) {
  return `<span class="badge badge-${escapeAttribute(type)}">${escapeHtml(label)}</span>`;
}

function renderTag(text) {
  return `<span class="tag">${escapeHtml(text)}</span>`;
}

function renderEmptyState(icon, title, subtitle) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title">${escapeHtml(title)}</div>
      <div class="empty-state-sub">${escapeHtml(subtitle)}</div>
    </div>
  `;
}

async function exportDataAsCsv() {
  const jobRows = [
    ["section", "id", "company", "role", "status", "referral_status", "referral_name", "referral_profile_url", "referral_context", "source", "job_type", "role_category", "deadline", "salary_range", "url", "starred", "date_added", "notes", "interview_notes"],
    ...state.jobs.map((job) => [
      "jobs",
      job.id,
      job.company,
      job.role,
      job.status,
      job.referral_status,
      job.referral_name,
      job.referral_profile_url,
      job.referral_context.join(" | "),
      job.source_site,
      job.job_type.join(" | "),
      job.role_category.join(" | "),
      job.deadline,
      job.salary_range,
      job.url,
      job.starred ? "yes" : "no",
      job.date_added,
      job.notes,
      job.interview_notes,
    ]),
  ];

  const contactRows = [
    ["section", "id", "name", "platform", "current_role", "current_company", "college", "past_companies", "person_type", "relationship", "outreach_stage", "linked_job_ids", "last_contacted", "profile_url", "notes"],
    ...state.contacts.map((contact) => [
      "contacts",
      contact.id,
      contact.name,
      contact.platform,
      contact.current_role,
      contact.current_company,
      contact.college,
      contact.past_companies.join(" | "),
      contact.person_type.join(" | "),
      contact.relationship,
      contact.outreach_stage,
      contact.linked_job_ids.join(" | "),
      contact.last_contacted,
      contact.profile_url,
      contact.notes,
    ]),
  ];

  const csv = [...jobRows, [], ...contactRows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `jobdesk-export-${todayDate()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("CSV export ready.");
}

function interpolateTemplate(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value || ""),
    template
  );
}

async function copyText(text, successLabel) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successLabel);
  } catch (error) {
    showToast("Could not copy to clipboard.");
  }
}

function showToast(message) {
  let toast = document.getElementById("jobdesk-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "jobdesk-toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.sync.get(keys, resolve));
}

function storageSet(payload) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(payload, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

function splitCommaValues(text) {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function findMatchingSavedContact(name, profileUrl = "") {
  const normalizedName = normalize(name);
  const normalizedProfile = normalize(profileUrl);
  return state.contacts.find((contact) => {
    if (normalizedProfile && normalize(contact.profile_url) === normalizedProfile) {
      return true;
    }
    return normalizedName && normalize(contact.name) === normalizedName;
  });
}

function hydrateReferralJobWithSavedContact(job) {
  if (!job) {
    return null;
  }

  const matchedContact = findMatchingSavedContact(job.referral_name, job.referral_profile_url);
  if (!matchedContact) {
    return null;
  }

  job.referral_name = matchedContact.name || job.referral_name;
  if (!job.referral_profile_url && matchedContact.profile_url) {
    job.referral_profile_url = matchedContact.profile_url;
  }
  return matchedContact;
}

function hydrateJobModalReferralFromSavedContact() {
  const matchedContact = findMatchingSavedContact(ui.jobForm.referralName.value, ui.jobForm.referralLink.value);
  if (!matchedContact) {
    return;
  }

  ui.jobForm.referralName.value = matchedContact.name || ui.jobForm.referralName.value;
  if (!ui.jobForm.referralLink.value && matchedContact.profile_url) {
    ui.jobForm.referralLink.value = matchedContact.profile_url;
  }
}

function createEmptyExperience() {
  return {
    company: "",
    title: "",
    location: "",
    start_date: "",
    end_date: "",
    summary: "",
    bullets: "",
  };
}

function createEmptyEducation() {
  return {
    institution: "",
    degree: "",
    field: "",
    location: "",
    start_date: "",
    end_date: "",
    grade: "",
    details: "",
  };
}

function normalizeExperienceEntry(entry) {
  return {
    company: String(entry?.company || "").trim(),
    title: String(entry?.title || "").trim(),
    location: String(entry?.location || "").trim(),
    start_date: String(entry?.start_date || "").trim(),
    end_date: String(entry?.end_date || "").trim(),
    summary: String(entry?.summary || "").trim(),
    bullets: String(entry?.bullets || "").trim(),
  };
}

function normalizeEducationEntry(entry) {
  return {
    institution: String(entry?.institution || "").trim(),
    degree: String(entry?.degree || "").trim(),
    field: String(entry?.field || "").trim(),
    location: String(entry?.location || "").trim(),
    start_date: String(entry?.start_date || "").trim(),
    end_date: String(entry?.end_date || "").trim(),
    grade: String(entry?.grade || "").trim(),
    details: String(entry?.details || "").trim(),
  };
}

function isExperienceEntryEmpty(entry) {
  return Object.values(normalizeExperienceEntry(entry)).every((value) => !value);
}

function isEducationEntryEmpty(entry) {
  return Object.values(normalizeEducationEntry(entry)).every((value) => !value);
}

function readExperienceCard(card) {
  return normalizeExperienceEntry({
    company: card.querySelector('[data-field="company"]')?.value,
    title: card.querySelector('[data-field="title"]')?.value,
    location: card.querySelector('[data-field="location"]')?.value,
    start_date: card.querySelector('[data-field="start_date"]')?.value,
    end_date: card.querySelector('[data-field="end_date"]')?.value,
    summary: card.querySelector('[data-field="summary"]')?.value,
    bullets: card.querySelector('[data-field="bullets"]')?.value,
  });
}

function readEducationCard(card) {
  return normalizeEducationEntry({
    institution: card.querySelector('[data-field="institution"]')?.value,
    degree: card.querySelector('[data-field="degree"]')?.value,
    field: card.querySelector('[data-field="field"]')?.value,
    location: card.querySelector('[data-field="location"]')?.value,
    start_date: card.querySelector('[data-field="start_date"]')?.value,
    end_date: card.querySelector('[data-field="end_date"]')?.value,
    grade: card.querySelector('[data-field="grade"]')?.value,
    details: card.querySelector('[data-field="details"]')?.value,
  });
}

function readExperienceCards(keepEmpty) {
  if (!ui.experienceLibrary) {
    return [];
  }

  return Array.from(ui.experienceLibrary.querySelectorAll("[data-experience-index]"))
    .map(readExperienceCard)
    .filter((entry) => keepEmpty || !isExperienceEntryEmpty(entry));
}

function readEducationCards(keepEmpty) {
  if (!ui.educationLibrary) {
    return [];
  }

  return Array.from(ui.educationLibrary.querySelectorAll("[data-education-index]"))
    .map(readEducationCard)
    .filter((entry) => keepEmpty || !isEducationEntryEmpty(entry));
}

function formatExperienceCopy(entry, mode) {
  const normalized = normalizeExperienceEntry(entry);
  const heading = [normalized.title, normalized.company].filter(Boolean).join(" at ");
  const meta = [
    normalized.location,
    [normalized.start_date, normalized.end_date].filter(Boolean).join(" - "),
  ]
    .filter(Boolean)
    .join(" | ");

  if (mode === "summary") {
    return [heading, meta, normalized.summary].filter(Boolean).join("\n");
  }
  if (mode === "bullets") {
    return normalized.bullets;
  }
  return [heading, meta, normalized.summary, normalized.bullets].filter(Boolean).join("\n\n");
}

function formatEducationCopy(entry, mode) {
  const normalized = normalizeEducationEntry(entry);
  const heading = [normalized.degree, normalized.field].filter(Boolean).join(", ");
  const school = normalized.institution;
  const meta = [
    normalized.location,
    [normalized.start_date, normalized.end_date].filter(Boolean).join(" - "),
    normalized.grade ? `Grade: ${normalized.grade}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  if (mode === "details") {
    return [heading, school, meta, normalized.details].filter(Boolean).join("\n");
  }
  return [heading, school, meta, normalized.details].filter(Boolean).join("\n\n");
}

function updateJobsViewMode() {
  ui.secondaryJobFilters?.classList.toggle("hidden", !state.moreJobFiltersOpen);
  if (ui.moreJobFiltersBtn) {
    ui.moreJobFiltersBtn.classList.toggle("active", state.moreJobFiltersOpen);
    ui.moreJobFiltersBtn.textContent = state.moreJobFiltersOpen ? "Hide filters" : "More filters";
  }
}

async function updateJobFieldFromSheet(jobId, field, rawValue) {
  const job = state.jobs.find((item) => item.id === jobId);
  if (!job) {
    return;
  }

  const previousValue = normalizeSheetValue(job[field], field);
  const nextValue = coerceSheetJobValue(field, rawValue);
  if (normalizeSheetValue(nextValue, field) === previousValue) {
    return;
  }

  job[field] = nextValue;
  if (field === "status") {
    appendActivity(job, `Status moved to ${JOB_STATUS_LABELS[nextValue]}`);
  }
  if (field === "referral_status") {
    appendActivity(job, nextValue ? `Referral status set to ${REFERRAL_STATUS_LABELS[nextValue]}` : "Cleared referral status");
  }
  if (["referral_name", "referral_profile_url"].includes(field)) {
    hydrateReferralJobWithSavedContact(job);
  }
  if (["referral_status", "referral_name", "referral_profile_url", "referral_context"].includes(field)) {
    syncReferralContactForJob(job);
  }
  await persistAndRender();
}

function coerceSheetJobValue(field, rawValue) {
  if (field === "referral_context") {
    return splitCommaValues(rawValue);
  }
  return String(rawValue || "").trim();
}

function normalizeSheetValue(value, field) {
  if (field === "referral_context") {
    return splitCommaValues(Array.isArray(value) ? value.join(", ") : value).join("|");
  }
  return String(value || "").trim();
}

function syncReferralContactForJob(job) {
  if (!job?.referral_name || !["asked", "yes"].includes(job.referral_status)) {
    return;
  }

  let contact = hydrateReferralJobWithSavedContact(job);

  if (!contact) {
    contact = {
      id: crypto.randomUUID(),
      name: job.referral_name.trim(),
      profile_url: job.referral_profile_url || "",
      platform: inferPlatformFromUrl(job.referral_profile_url),
      current_role: "",
      current_company: job.company,
      college: "",
      past_companies: [],
      person_type: ["Employee"],
      relationship: "referral",
      outreach_stage: job.referral_status === "yes" ? "referred" : "1st_reachout",
      linked_job_ids: [job.id],
      last_contacted: job.referral_status === "asked" ? todayDate() : "",
      notes: job.referral_context.length
        ? `Referral context: ${job.referral_context.join(", ")}`
        : "Referral contact synced from job.",
      email: "",
    };
    state.contacts.unshift(contact);
    appendActivity(job, `Created contact for ${contact.name}`);
    return;
  }

  contact.name = job.referral_name.trim();
  if (job.referral_profile_url) {
    contact.profile_url = job.referral_profile_url;
    contact.platform = inferPlatformFromUrl(job.referral_profile_url);
  }
  contact.current_company = job.company || contact.current_company;
  contact.relationship = "referral";
  if (job.referral_status === "yes") {
    contact.outreach_stage = "referred";
  } else if (job.referral_status === "asked" && contact.outreach_stage !== "referred") {
    contact.outreach_stage = "1st_reachout";
  }
  if (job.referral_status === "asked" && !contact.last_contacted) {
    contact.last_contacted = todayDate();
  }
  if (!contact.linked_job_ids.includes(job.id)) {
    contact.linked_job_ids.push(job.id);
  }
  contact.person_type = [...new Set([...(contact.person_type || []), "Employee"])];
  if (job.referral_context.length) {
    const noteLine = `Referral context: ${job.referral_context.join(", ")}`;
    if (!contact.notes.includes(noteLine)) {
      contact.notes = contact.notes ? `${contact.notes}\n${noteLine}` : noteLine;
    }
  }
}

function inferPlatformFromUrl(url) {
  if (!url) {
    return "LinkedIn";
  }
  const lowered = url.toLowerCase();
  if (lowered.includes("linkedin.com")) return "LinkedIn";
  if (lowered.includes("github.com")) return "GitHub";
  if (lowered.includes("x.com") || lowered.includes("twitter.com")) return "Twitter";
  return "Other";
}

function renderLastContactedText(dateString) {
  if (!dateString) {
    return "Not contacted yet";
  }
  const days = diffInDays(dateString, todayDate());
  return days === 0 ? "Last contacted today" : `Last contacted ${days} day${days === 1 ? "" : "s"} ago`;
}

function diffInDays(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((to - from) / 86400000));
}

function formatDateTime(value) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function todayDate() {
  return formatLocalDate(new Date());
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function truncate(text, max) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function normalize(value) {
  return (value || "").trim().toLowerCase();
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
