const JOB_TYPE_PATTERNS = [
  { test: /\b(intern|internship)\b/i, tag: "Internship" },
  { test: /\b(contract|contractor|freelance)\b/i, tag: "Contract" },
  { test: /\b(part[- ]?time)\b/i, tag: "Part-time" },
  { test: /\bremote\b/i, tag: "Remote" },
  { test: /\bhybrid\b/i, tag: "Hybrid" },
];

const ROLE_CATEGORY_PATTERNS = [
  { test: /\b(engineer|developer|swe|backend|frontend|ios|android)\b/i, tag: "Software Engineering" },
  { test: /\b(product manager|product management|pm|apm|rpm)\b/i, tag: "Product Management" },
  { test: /\b(venture capital|vc|investor|investment analyst)\b/i, tag: "Venture Capital" },
  { test: /\b(consultant|consulting|strategy|advisory)\b/i, tag: "Consulting" },
  { test: /\b(data scientist|data analyst|machine learning|ml|artificial intelligence|ai)\b/i, tag: "Data & AI" },
  { test: /\b(design|ux|ui|product designer)\b/i, tag: "Design" },
  { test: /\b(finance|investment banking|private equity|pe)\b/i, tag: "Finance" },
  { test: /\b(marketing|growth|brand|content)\b/i, tag: "Marketing" },
  { test: /\b(operations|ops|chief of staff)\b/i, tag: "Operations" },
  { test: /\b(research|researcher|scientist)\b/i, tag: "Research" },
];

const PERSON_TYPE_PATTERNS = [
  { test: /\b(recruiter|talent|hr|people partner)\b/i, tag: "Recruiter" },
  { test: /\b(hiring manager|engineering manager|em|head of)\b/i, tag: "Hiring Manager" },
  { test: /\b(founder|co-founder|ceo)\b/i, tag: "Founder" },
  { test: /\b(partner|principal|investor)\b/i, tag: "Investor" },
];

const OVERLAY_ID = "jobdesk-page-capture";
const STYLE_ID = "jobdesk-page-capture-style";
const BLOCKED_CAPTURE_HOSTS = [/^mail\.google\.com$/i];

const pageCaptureState = {
  currentUrl: location.href,
  context: null,
  currentSelectionKey: "",
  dismissedContextKey: "",
  initialized: false,
  saving: false,
  overlayDismissTimeoutId: null,
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "JOBDESK_SCRAPE_PAGE") {
    return false;
  }

  if (shouldIgnorePageForCapture()) {
    sendResponse({ kind: "none" });
    return false;
  }

  sendResponse(scrapeCurrentPage(message));
  return false;
});

initializePageCapture();

function scrapeCurrentPage(message) {
  if (shouldIgnorePageForCapture()) {
    return { kind: "none" };
  }

  const url = window.location.href;
  const title = document.title || "";
  const rawBodyText = getRawBodyText();
  const bodyText = cleanText(rawBodyText).slice(0, 25000);
  const sourceSite = detectSourceSite(url);
  const loweredUrl = url.toLowerCase();

  if (looksLikeJobPage(loweredUrl, title, bodyText)) {
    const job = extractJob(sourceSite, title, bodyText, rawBodyText, url);
    if (isSavedJob(job, message?.savedJobs || [])) {
      return { kind: "none" };
    }
    return {
      kind: "job",
      title: `${job.role || "Role detected"} at ${job.company || "Unknown company"}`,
      data: job,
    };
  }

  if (looksLikeProfilePage(loweredUrl, title, bodyText)) {
    const contact = extractContact(
      sourceSite,
      title,
      bodyText,
      rawBodyText,
      url,
      message?.settings?.college,
      message?.savedJobs || []
    );
    if (isSavedContact(contact, message?.savedContacts || [])) {
      return { kind: "none" };
    }
    return {
      kind: "contact",
      title: `${contact.name || "Profile detected"}${contact.current_company ? ` at ${contact.current_company}` : ""}`,
      data: contact,
    };
  }

  return { kind: "none" };
}

function extractJob(sourceSite, title, bodyText, rawBodyText, url) {
  const linkedinSelectedJob = sourceSite === "LinkedIn" ? extractLinkedInSelectedJob(url) : null;

  const titleText = linkedinSelectedJob?.role || firstText([
    '[data-test="job-title"]',
    ".job-details-jobs-unified-top-card__job-title",
    ".jobs-unified-top-card__job-title",
    "h1",
    "main h1",
  ]);

  const companyText = linkedinSelectedJob?.company || firstText([
    '[data-test="job-company"]',
    ".job-details-jobs-unified-top-card__company-name",
    ".jobs-unified-top-card__company-name",
    ".topcard__org-name-link",
    ".posting-headline__company",
    'a[href*="/company/"]',
  ]);

  const fallback = parseTitleForJob(title);
  const role = cleanText(titleText || fallback.role);
  const company = cleanText(
    companyText ||
      (sourceSite === "Kula" ? extractKulaCompany(title, rawBodyText, url) : "") ||
      fallback.company
  );
  const descriptionText = cleanText(linkedinSelectedJob?.detailText || bodyText);
  const jobUrl = cleanText(linkedinSelectedJob?.url || url);
  const salary = findSalary(descriptionText);
  const jobType = detectJobTypes(`${role} ${title} ${descriptionText}`);
  const roleCategory = detectRoleCategories(`${role} ${title} ${descriptionText}`);

  return {
    company,
    role,
    url: jobUrl,
    source_site: sourceSite,
    job_type: jobType.length ? jobType : ["Full-time"],
    role_category: roleCategory,
    salary_range: salary,
  };
}

function extractContact(sourceSite, title, bodyText, rawBodyText, url, userCollege, savedJobs) {
  const nameText = firstText([
    "h1",
    ".text-heading-xlarge",
    ".pv-text-details__left-panel h1",
    '[data-anonymize="person-name"]',
  ]) || extractMetaContent(["og:title", "twitter:title"]);
  const headlineText = firstText([
    ".text-body-medium",
    ".pv-text-details__left-panel .text-body-medium",
    ".profile-description",
  ]) || extractMetaContent(["description", "og:description", "twitter:description"]);
  const companyText = firstText([
    '.pv-text-details__right-panel .text-body-small',
    '.pv-text-details__left-panel [aria-label*="current company"]',
  ]);
  const collegeText = firstText([
    "#education ~ * li span[aria-hidden='true']",
    'section[id*="education"] li span[aria-hidden="true"]',
  ]);

  const guessed = parseTitleForContact(title);
  const currentCompany = cleanText(companyText || guessCompanyFromHeadline(headlineText));
  const currentRole = cleanText(headlineText || guessed.currentRole);
  const name = cleanText(nameText || guessed.name);
  const personTypes = detectPersonTypes(`${headlineText} ${bodyText}`);

  if (
    currentCompany &&
    savedJobs.some((job) => normalize(job.company) === normalize(currentCompany)) &&
    !personTypes.includes("Employee")
  ) {
    personTypes.push("Employee");
  }

  if (
    userCollege &&
    collegeText &&
    normalize(collegeText) === normalize(userCollege) &&
    !personTypes.includes("Alumni")
  ) {
    personTypes.push("Alumni");
  }

  return {
    name,
    profile_url: url,
    platform: sourceSite === "LinkedIn" ? "LinkedIn" : sourceSite || "Other",
    current_role: currentRole,
    current_company: currentCompany,
    college: cleanText(collegeText),
    past_companies: detectPastCompanies(rawBodyText, currentCompany),
    person_type: personTypes,
  };
}

function looksLikeJobPage(url, title, bodyText) {
  return (
    /(careers\.kula\.ai|darwinbox|monster\.com|ziprecruiter\.com|dice\.com|idealist\.org|getwork\.com|snagajob\.com|instahyre\.com|naukri\.com|flexjobs\.com|\/jobs\/|job description|apply now|responsibilities|qualifications)/i.test(`${url} ${title}`) ||
    (/\b(job|position|opening)\b/i.test(title) && /\b(apply|responsibilities|qualifications)\b/i.test(bodyText))
  );
}

function looksLikeProfilePage(url, title, bodyText) {
  return (
    (
      /(linkedin\.com\/in\/|linkedin\.com\/pub\/|scholar\.google\.com\/citations|github\.com\/[^/]+\/?$|(?:twitter|x)\.com\/[^/]+\/?$)/i.test(
        `${url} ${title}`
      ) ||
      /\b(about me|experience|education)\b/i.test(title)
    ) &&
    /\b(experience|education|connect|message|repositories|followers|publications)\b/i.test(bodyText)
  );
}

function detectSourceSite(url) {
  if (/careers\.kula\.ai/i.test(url)) return "Kula";
  if (/linkedin\.com\/jobs/i.test(url)) return "LinkedIn";
  if (/linkedin\.com\/in\//i.test(url)) return "LinkedIn";
  if (/indeed\.com/i.test(url)) return "Indeed";
  if (/glassdoor\.com/i.test(url)) return "Glassdoor";
  if (/greenhouse\.io/i.test(url)) return "Greenhouse";
  if (/lever\.co/i.test(url)) return "Lever";
  if (/monster\.com/i.test(url)) return "Monster";
  if (/ziprecruiter\.com/i.test(url)) return "ZipRecruiter";
  if (/dice\.com/i.test(url)) return "Dice";
  if (/idealist\.org/i.test(url)) return "Idealist";
  if (/getwork\.com/i.test(url)) return "Getwork";
  if (/snagajob\.com/i.test(url)) return "Snagajob";
  if (/instahyre\.com/i.test(url)) return "Instahyre";
  if (/naukri\.com/i.test(url)) return "Naukri";
  if (/flexjobs\.com/i.test(url)) return "FlexJobs";
  if (/darwinbox/i.test(url)) return "Darwinbox";
  if (/workday/i.test(url)) return "Workday";
  if (/handshake\.com/i.test(url)) return "Handshake";
  if (/wellfound\.com|angel\.co/i.test(url)) return "Wellfound";
  if (/github\.com/i.test(url)) return "GitHub";
  if (/scholar\.google/i.test(url)) return "Google Scholar";
  return "Other";
}

function detectJobTypes(text) {
  const tags = JOB_TYPE_PATTERNS.filter((entry) => entry.test.test(text)).map((entry) => entry.tag);
  return tags.length ? unique(tags) : ["Full-time"];
}

function detectRoleCategories(text) {
  return unique(ROLE_CATEGORY_PATTERNS.filter((entry) => entry.test.test(text)).map((entry) => entry.tag));
}

function detectPersonTypes(text) {
  return unique(PERSON_TYPE_PATTERNS.filter((entry) => entry.test.test(text)).map((entry) => entry.tag));
}

function detectPastCompanies(bodyText, currentCompany) {
  const lines = bodyText
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean);
  const companies = [];
  for (const line of lines) {
    if (/ at /i.test(line) || /\b(experience|worked at|previously)\b/i.test(line)) {
      const pieces = line.split(/ at | @ /i).map(cleanText).filter(Boolean);
      pieces.forEach((piece) => {
        if (
          piece &&
          piece.length <= 40 &&
          !/\b(experience|education|full-time|part-time)\b/i.test(piece) &&
          normalize(piece) !== normalize(currentCompany)
        ) {
          companies.push(piece);
        }
      });
    }
  }
  return unique(companies).slice(0, 5);
}

function extractLinkedInSelectedJob(fallbackUrl) {
  const detailContainer = firstElement([
    ".jobs-search__job-details--container",
    ".jobs-search__job-details--wrapper",
    ".job-view-layout",
    ".jobs-details",
    ".jobs-search-two-pane__details",
  ]);

  const selectedCard = firstElement([
    '.jobs-search-results__list-item--active',
    '.jobs-search-results-list__list-item--active',
    'li[aria-current="true"][data-occludable-job-id]',
    '.job-card-container--clicked',
  ]);

  const role = firstTextWithin(detailContainer, [
    ".job-details-jobs-unified-top-card__job-title",
    ".jobs-unified-top-card__job-title",
    'a[href*="/jobs/view/"]',
    "h1",
  ]) || firstTextWithin(selectedCard, [
    ".job-card-list__title",
    ".job-card-container__link",
    'a[href*="/jobs/view/"]',
  ]);

  const company = firstTextWithin(detailContainer, [
    ".job-details-jobs-unified-top-card__company-name",
    ".jobs-unified-top-card__company-name",
    ".job-details-jobs-unified-top-card__primary-description a",
    'a[href*="/company/"]',
  ]) || firstTextWithin(selectedCard, [
    ".job-card-container__company-name",
    ".artdeco-entity-lockup__subtitle",
    ".job-card-container__primary-description",
  ]);

  const jobUrl =
    normalizeLinkedInJobUrl(
      firstHrefWithin(detailContainer, [
        '.job-details-jobs-unified-top-card__job-title a[href*="/jobs/view/"]',
        '.jobs-unified-top-card__job-title a[href*="/jobs/view/"]',
        'a[href*="/jobs/view/"]',
      ]) ||
        firstHrefWithin(selectedCard, [
          '.job-card-list__title[href*="/jobs/view/"]',
          '.job-card-container__link[href*="/jobs/view/"]',
          'a[href*="/jobs/view/"]',
        ]) ||
        extractLinkedInJobUrlFromPage(fallbackUrl)
    ) || fallbackUrl;

  const detailText = cleanText(detailContainer?.innerText || "");

  if (!role && !company) {
    return null;
  }

  return {
    role: cleanText(role),
    company: cleanText(company),
    url: jobUrl,
    detailText,
  };
}

function extractKulaCompany(title, rawBodyText, url) {
  const aboutMatch = String(rawBodyText || "").match(/\bAbout\s+([^\n:]{2,80})\s*:/i);
  if (aboutMatch?.[1]) {
    return cleanCompanyName(aboutMatch[1]);
  }

  const titleFallback = parseTitleForJob(title).company;
  if (titleFallback) {
    return cleanCompanyName(titleFallback);
  }

  try {
    const parsed = new URL(url, window.location.origin);
    const slug = parsed.pathname.split("/").filter(Boolean)[0];
    if (slug) {
      return cleanCompanySlug(slug);
    }
  } catch (error) {
    return "";
  }

  return "";
}

function parseTitleForJob(title) {
  const separators = [" at ", " | ", " - ", " – "];
  for (const separator of separators) {
    if (title.includes(separator)) {
      const [role, company] = title.split(separator);
      if (role && company) {
        return { role: cleanText(role), company: cleanText(company) };
      }
    }
  }
  return { role: cleanText(title), company: "" };
}

function parseTitleForContact(title) {
  const separators = [" | ", " - ", " – "];
  for (const separator of separators) {
    if (title.includes(separator)) {
      const [name, currentRole] = title.split(separator);
      return { name: cleanText(name), currentRole: cleanText(currentRole) };
    }
  }
  return { name: cleanText(title), currentRole: "" };
}

function guessCompanyFromHeadline(headline) {
  if (!headline) {
    return "";
  }
  const match = headline.match(/\b(?:at|@)\s+([^|,·]+)/i);
  return match ? cleanText(match[1]) : "";
}

function findSalary(text) {
  const match = text.match(/(\$|₹|£|€)\s?\d[\d,]*(?:\s?(?:k|K))?(?:\s?[-–to]+\s?(?:\$|₹|£|€)?\s?\d[\d,]*(?:\s?(?:k|K))?)?/);
  return match ? cleanText(match[0]) : "";
}

function firstText(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const text = cleanText(element?.textContent || "");
    if (text) {
      return text;
    }
  }
  return "";
}

function firstElement(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }
  return null;
}

function firstTextWithin(container, selectors) {
  if (!container) {
    return "";
  }
  for (const selector of selectors) {
    const element = container.querySelector(selector);
    const text = cleanText(element?.textContent || "");
    if (text) {
      return text;
    }
  }
  return "";
}

function firstHrefWithin(container, selectors) {
  if (!container) {
    return "";
  }
  for (const selector of selectors) {
    const element = container.querySelector(selector);
    const href = cleanText(element?.getAttribute("href") || "");
    if (href) {
      return absolutizeUrl(href);
    }
  }
  return "";
}

function extractMetaContent(names) {
  for (const name of names) {
    const element =
      document.querySelector(`meta[property="${name}"]`) ||
      document.querySelector(`meta[name="${name}"]`);
    const text = cleanText(element?.getAttribute("content") || "");
    if (text) {
      return text;
    }
  }
  return "";
}

function getRawBodyText() {
  return String(document.body?.innerText || "").slice(0, 40000);
}

function extractLinkedInJobUrlFromPage(url) {
  const currentUrl = new URL(url, window.location.origin);
  const currentJobId = currentUrl.searchParams.get("currentJobId");
  if (currentJobId) {
    return `${currentUrl.origin}/jobs/view/${currentJobId}/`;
  }
  const match = currentUrl.pathname.match(/\/jobs\/view\/(\d+)/i);
  if (match) {
    return `${currentUrl.origin}/jobs/view/${match[1]}/`;
  }
  return url;
}

function normalizeLinkedInJobUrl(url) {
  if (!url) {
    return "";
  }
  const absoluteUrl = absolutizeUrl(url);
  const match = absoluteUrl.match(/(https?:\/\/[^/]+\/jobs\/view\/\d+\/?)/i);
  return match ? match[1] : absoluteUrl;
}

function absolutizeUrl(url) {
  try {
    return new URL(url, window.location.origin).toString();
  } catch (error) {
    return url;
  }
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function shouldIgnorePageForCapture(url = window.location.href) {
  try {
    const hostname = new URL(url, window.location.origin).hostname;
    return BLOCKED_CAPTURE_HOSTS.some((pattern) => pattern.test(hostname));
  } catch (error) {
    return false;
  }
}

function cleanCompanyName(value) {
  return cleanText(String(value || "").replace(/\.(com|ai|in|io|co|org)\b/gi, (match) => match.toUpperCase()));
}

function cleanCompanySlug(slug) {
  const normalized = String(slug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\bai\b/gi, "AI")
    .replace(/\bid\b/gi, "ID");
  return cleanCompanyName(titleCase(normalized));
}

function titleCase(value) {
  return String(value || "").replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalize(value) {
  return cleanText(value).toLowerCase();
}

function isSavedJob(job, savedJobs) {
  const normalizedUrl = normalize(job?.url);
  const normalizedCompany = normalize(job?.company);
  const normalizedRole = normalize(job?.role);

  return (savedJobs || []).some((savedJob) => {
    if (normalizedUrl && normalize(savedJob?.url) === normalizedUrl) {
      return true;
    }
    return (
      normalizedCompany &&
      normalizedRole &&
      normalize(savedJob?.company) === normalizedCompany &&
      normalize(savedJob?.role) === normalizedRole
    );
  });
}

function isSavedContact(contact, savedContacts) {
  const normalizedProfileUrl = normalize(contact?.profile_url);
  const normalizedName = normalize(contact?.name);

  return (savedContacts || []).some((savedContact) => {
    if (normalizedProfileUrl && normalize(savedContact?.profile_url) === normalizedProfileUrl) {
      return true;
    }
    return normalizedName && normalize(savedContact?.name) === normalizedName;
  });
}

function getContextKey(context) {
  if (!context?.kind || !context?.data) {
    return "";
  }

  if (context.kind === "job") {
    return [
      "job",
      normalize(context.data.url),
      normalize(context.data.role),
      normalize(context.data.company),
    ].join("|");
  }

  if (context.kind === "contact") {
    return [
      "contact",
      normalize(context.data.profile_url),
      normalize(context.data.name),
      normalize(context.data.current_company),
    ].join("|");
  }

  return "";
}

async function initializePageCapture() {
  if (pageCaptureState.initialized) {
    return;
  }
  pageCaptureState.initialized = true;
  if (shouldIgnorePageForCapture()) {
    removeOverlay();
    return;
  }
  injectOverlayStyles();
  await refreshPageCapture();
  watchForNavigationChanges();
}

function watchForNavigationChanges() {
  window.setInterval(() => {
    if (location.href !== pageCaptureState.currentUrl) {
      pageCaptureState.currentUrl = location.href;
      pageCaptureState.dismissedContextKey = "";
      if (shouldIgnorePageForCapture()) {
        removeOverlay();
        return;
      }
      refreshPageCapture();
      return;
    }

    if (shouldIgnorePageForCapture()) {
      removeOverlay();
      return;
    }

    if (/linkedin\.com\/jobs/i.test(location.href)) {
      const selectedJob = extractLinkedInSelectedJob(location.href);
      const selectionKey = selectedJob
        ? `${selectedJob.url}|${selectedJob.role}|${selectedJob.company}`
        : "";
      if (selectionKey !== pageCaptureState.currentSelectionKey) {
        refreshPageCapture();
      }
    }
  }, 1000);
}

async function refreshPageCapture() {
  try {
    const requirements = await chrome.runtime.sendMessage({ type: "JOBDESK_GET_CAPTURE_REQUIREMENTS" });
    if (!requirements?.ok) {
      removeOverlay();
      return;
    }

    const context = scrapeCurrentPage({
      settings: { college: requirements.settings?.college || "" },
      savedJobs: requirements.savedJobs || [],
      savedContacts: requirements.savedContacts || [],
    });
    const contextKey = getContextKey(context);

    if (context.kind === "job" || context.kind === "contact") {
      if (contextKey && contextKey === pageCaptureState.dismissedContextKey) {
        pageCaptureState.context = null;
        pageCaptureState.currentSelectionKey = contextKey;
        removeOverlay();
        return;
      }
      pageCaptureState.context = context;
      pageCaptureState.currentSelectionKey = contextKey;
      renderOverlay(context);
    } else {
      pageCaptureState.context = null;
      pageCaptureState.currentSelectionKey = "";
      removeOverlay();
    }
  } catch (error) {
    pageCaptureState.currentSelectionKey = "";
    removeOverlay();
  }
}

function injectOverlayStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 296px;
      padding: 9px 10px;
      border: 1px solid #E3DFD7;
      border-radius: 14px;
      background: rgba(247,245,240,0.97);
      box-shadow: 0 12px 30px rgba(28,26,22,0.14);
      backdrop-filter: blur(10px);
      font-family: Jost, Arial, sans-serif;
      color: #1C1A16;
    }
    .jobdesk-page-capture__top {
      display: grid;
      grid-template-columns: 30px minmax(0, 1fr) 22px;
      align-items: start;
      gap: 8px;
    }
    #${OVERLAY_ID}[data-kind="contact"] .jobdesk-page-capture__emoji::before {
      content: "👤";
    }
    #${OVERLAY_ID}[data-kind="job"] .jobdesk-page-capture__emoji::before {
      content: "💼";
    }
    .jobdesk-page-capture__emoji {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #FAEADE;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 16px;
    }
    .jobdesk-page-capture__body {
      min-width: 0;
    }
    .jobdesk-page-capture__close {
      width: 22px;
      height: 22px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: #8A8880;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: -2px;
    }
    .jobdesk-page-capture__close:hover {
      background: rgba(0,0,0,0.05);
      color: #1C1A16;
    }
    .jobdesk-page-capture__label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #D4622A;
      margin-bottom: 1px;
    }
    .jobdesk-page-capture__title {
      font-size: 12px;
      font-weight: 600;
      line-height: 1.25;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .jobdesk-page-capture__subtitle {
      font-size: 11px;
      color: #6B6760;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
    }
    .jobdesk-page-capture__button {
      border: none;
      border-radius: 999px;
      background: #D4622A;
      color: white;
      padding: 6px 10px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.15s ease;
      white-space: nowrap;
      align-self: flex-start;
    }
    .jobdesk-page-capture__button:hover {
      background: #B85223;
      transform: translateY(-1px);
    }
    .jobdesk-page-capture__button[data-variant="saved"] {
      background: #2D7D46;
    }
    .jobdesk-page-capture__button[data-variant="duplicate"] {
      background: #8A8880;
    }
    .jobdesk-page-capture__button:disabled {
      opacity: 0.75;
      cursor: default;
      transform: none;
    }
  `;
  document.documentElement.appendChild(style);
}

function renderOverlay(context) {
  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <div class="jobdesk-page-capture__top">
        <div class="jobdesk-page-capture__emoji" aria-hidden="true"></div>
        <div class="jobdesk-page-capture__body">
          <div class="jobdesk-page-capture__label">Detected on this page</div>
          <div class="jobdesk-page-capture__title"></div>
          <div class="jobdesk-page-capture__subtitle"></div>
        </div>
        <button type="button" class="jobdesk-page-capture__close" aria-label="Dismiss">×</button>
      </div>
      <button type="button" class="jobdesk-page-capture__button"></button>
    `;
    document.documentElement.appendChild(overlay);
    overlay.querySelector(".jobdesk-page-capture__close").onclick = () => {
      pageCaptureState.dismissedContextKey = getContextKey(pageCaptureState.context);
      pageCaptureState.context = null;
      removeOverlay();
    };
  }

  overlay.dataset.kind = context.kind;
  overlay.querySelector(".jobdesk-page-capture__title").textContent =
    context.kind === "job"
      ? context.data.role || "Job detected"
      : context.data.name || "Profile detected";
  overlay.querySelector(".jobdesk-page-capture__subtitle").textContent =
    context.kind === "job"
      ? context.data.company || context.data.source_site || "Ready to save"
      : [context.data.current_role, context.data.current_company].filter(Boolean).join(" · ") || context.data.platform || "Ready to save";

  const button = overlay.querySelector(".jobdesk-page-capture__button");
  button.textContent = context.kind === "job" ? "Save Job" : "Save Person";
  button.dataset.variant = "default";
  button.disabled = pageCaptureState.saving;
  button.onclick = handleOverlaySave;
  scheduleOverlayAutoDismiss();
}

function removeOverlay() {
  if (pageCaptureState.overlayDismissTimeoutId) {
    window.clearTimeout(pageCaptureState.overlayDismissTimeoutId);
    pageCaptureState.overlayDismissTimeoutId = null;
  }
  document.getElementById(OVERLAY_ID)?.remove();
}

function scheduleOverlayAutoDismiss() {
  if (pageCaptureState.overlayDismissTimeoutId) {
    window.clearTimeout(pageCaptureState.overlayDismissTimeoutId);
  }
  pageCaptureState.overlayDismissTimeoutId = window.setTimeout(() => {
    pageCaptureState.dismissedContextKey = getContextKey(pageCaptureState.context);
    pageCaptureState.context = null;
    removeOverlay();
  }, 20000);
}

async function handleOverlaySave() {
  if (!pageCaptureState.context || pageCaptureState.saving) {
    return;
  }

  const overlay = document.getElementById(OVERLAY_ID);
  const button = overlay?.querySelector(".jobdesk-page-capture__button");
  if (!button) {
    return;
  }

  pageCaptureState.saving = true;
  button.disabled = true;
  button.textContent = "Saving...";
  button.dataset.variant = "default";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "JOBDESK_SAVE_CAPTURED_ENTITY",
      payload: pageCaptureState.context,
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Save failed");
    }

    if (response.status === "saved") {
      button.textContent = "Saved";
      button.dataset.variant = "saved";
    } else if (response.status === "duplicate") {
      button.textContent = "Already Saved";
      button.dataset.variant = "duplicate";
    } else {
      button.textContent = "Saved";
      button.dataset.variant = "saved";
    }
  } catch (error) {
    button.textContent = "Try Again";
    button.dataset.variant = "default";
  } finally {
    pageCaptureState.saving = false;
    button.disabled = false;
  }
}
