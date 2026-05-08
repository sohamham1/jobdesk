const STORAGE_KEYS = {
  jobs: "jobs",
  contacts: "contacts",
  settings: "settings",
};

const DEFAULT_SETTINGS = {
  college: "",
  followup_days: 5,
  notifications_enabled: true,
};

const DAILY_ALARM = "jobdeskDailyCheck";
const NOTIFICATION_ID = "jobdeskFollowups";

chrome.runtime.onInstalled.addListener(async () => {
  await scheduleNextAlarm();
  await refreshBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await scheduleNextAlarm();
  await refreshBadge();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== DAILY_ALARM) {
    return;
  }

  await runDailyCheck();
  await scheduleNextAlarm();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "JOBDESK_DATA_UPDATED") {
    refreshBadge().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === "JOBDESK_GET_CAPTURE_REQUIREMENTS") {
    chrome.storage.sync
      .get([STORAGE_KEYS.jobs, STORAGE_KEYS.settings])
      .then((data) =>
        sendResponse({
          ok: true,
          settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
          savedJobs: (data.jobs || []).map((job) => ({ id: job.id, company: job.company })),
        })
      );
    return true;
  }
  if (message?.type === "JOBDESK_SAVE_CAPTURED_ENTITY") {
    saveCapturedEntity(message.payload)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || "Save failed" }));
    return true;
  }
  return false;
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId !== NOTIFICATION_ID) {
    return;
  }

  chrome.tabs.create({ url: chrome.runtime.getURL("popup.html?mode=app#nudges") });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && (changes.contacts || changes.settings)) {
    refreshBadge();
  }
});

async function runDailyCheck() {
  const data = await chrome.storage.sync.get([
    STORAGE_KEYS.contacts,
    STORAGE_KEYS.settings,
  ]);
  const settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  const dueContacts = getDueContacts(data.contacts || [], settings.followup_days);

  await setBadgeCount(dueContacts.length);

  if (!settings.notifications_enabled || !dueContacts.length) {
    return;
  }

  chrome.notifications.create(NOTIFICATION_ID, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "JobDesk follow-ups due",
    message:
      dueContacts.length === 1
        ? `${dueContacts[0].name} is ready for a follow-up.`
        : `${dueContacts.length} contacts are ready for a follow-up.`,
    priority: 2,
  });
}

async function refreshBadge() {
  const data = await chrome.storage.sync.get([
    STORAGE_KEYS.contacts,
    STORAGE_KEYS.settings,
  ]);
  const settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  const dueContacts = getDueContacts(data.contacts || [], settings.followup_days);
  await setBadgeCount(dueContacts.length);
}

async function setBadgeCount(count) {
  await chrome.action.setBadgeBackgroundColor({ color: "#D4622A" });
  await chrome.action.setBadgeText({ text: count ? String(count) : "" });
}

async function scheduleNextAlarm() {
  const when = getNextNineAm();
  await chrome.alarms.clear(DAILY_ALARM);
  chrome.alarms.create(DAILY_ALARM, { when });
}

function getNextNineAm() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(9, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

function getDueContacts(contacts, threshold) {
  const today = currentDateString();
  return contacts.filter((contact) => {
    if (!contact?.last_contacted) {
      return false;
    }
    if (["replied", "referred", "no_response"].includes(contact.outreach_stage)) {
      return false;
    }
    return diffInDays(contact.last_contacted, today) >= threshold;
  });
}

function diffInDays(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((to - from) / 86400000));
}

function currentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function saveCapturedEntity(payload) {
  if (!payload?.kind || !payload?.data) {
    throw new Error("Missing captured data");
  }

  const data = await chrome.storage.sync.get([
    STORAGE_KEYS.jobs,
    STORAGE_KEYS.contacts,
    STORAGE_KEYS.settings,
  ]);
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  const contacts = Array.isArray(data.contacts) ? data.contacts : [];
  const settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };

  if (payload.kind === "job") {
    return saveCapturedJob(jobs, contacts, payload.data);
  }

  if (payload.kind === "contact") {
    return saveCapturedContact(jobs, contacts, settings, payload.data);
  }

  throw new Error("Unknown capture type");
}

async function saveCapturedJob(jobs, contacts, rawJob) {
  const url = String(rawJob.url || "").trim();
  const existing = jobs.find((job) => job.url && job.url === url);
  if (existing) {
    return {
      status: "duplicate",
      kind: "job",
      id: existing.id,
      message: `${existing.role} at ${existing.company} was already saved`,
    };
  }

  const nextJob = {
    id: crypto.randomUUID(),
    company: String(rawJob.company || "").trim(),
    role: String(rawJob.role || "").trim(),
    url,
    source_site: String(rawJob.source_site || "Other").trim() || "Other",
    job_type: uniqueStrings(rawJob.job_type),
    role_category: uniqueStrings(rawJob.role_category),
    status: "saved",
    referral_status: "",
    referral_name: "",
    referral_profile_url: "",
    referral_context: [],
    starred: false,
    date_added: new Date().toISOString(),
    deadline: "",
    salary_range: String(rawJob.salary_range || "").trim(),
    notes: "",
    interview_notes: "",
    activity: [{ at: new Date().toISOString(), message: "Job saved from page capture" }],
  };

  if (!nextJob.company || !nextJob.role) {
    throw new Error("Could not capture enough job details");
  }

  jobs.unshift(nextJob);
  await chrome.storage.sync.set({ [STORAGE_KEYS.jobs]: jobs });
  await refreshBadge();

  return {
    status: "saved",
    kind: "job",
    id: nextJob.id,
    message: `Saved ${nextJob.role} at ${nextJob.company}`,
  };
}

async function saveCapturedContact(jobs, contacts, settings, rawContact) {
  const profileUrl = String(rawContact.profile_url || "").trim();
  const existing = contacts.find((contact) => contact.profile_url && contact.profile_url === profileUrl);
  if (existing) {
    return {
      status: "duplicate",
      kind: "contact",
      id: existing.id,
      message: `${existing.name} was already saved`,
    };
  }

  const currentCompany = String(rawContact.current_company || "").trim();
  const college = String(rawContact.college || "").trim();
  const personType = uniqueStrings([
    ...(Array.isArray(rawContact.person_type) ? rawContact.person_type : []),
    ...(currentCompany &&
    jobs.some((job) => normalize(job.company) === normalize(currentCompany))
      ? ["Employee"]
      : []),
    ...(college && settings.college && normalize(college) === normalize(settings.college)
      ? ["Alumni"]
      : []),
  ]);

  const nextContact = {
    id: crypto.randomUUID(),
    name: String(rawContact.name || "").trim(),
    profile_url: profileUrl,
    platform: String(rawContact.platform || "LinkedIn").trim() || "LinkedIn",
    current_role: String(rawContact.current_role || "").trim(),
    current_company: currentCompany,
    college,
    past_companies: uniqueStrings(rawContact.past_companies),
    person_type: personType,
    relationship: "cold",
    outreach_stage: "1st_reachout",
    linked_job_ids: [],
    last_contacted: "",
    notes: "",
    email: "",
  };

  if (!nextContact.name) {
    throw new Error("Could not capture enough contact details");
  }

  contacts.unshift(nextContact);
  await chrome.storage.sync.set({ [STORAGE_KEYS.contacts]: contacts });
  await refreshBadge();

  return {
    status: "saved",
    kind: "contact",
    id: nextContact.id,
    message: `Saved ${nextContact.name}`,
  };
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}
