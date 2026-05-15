/**
 * One-time seed script: pushes all 68 HubSpot CSV features into HROne Studio.
 * Run: node scripts/seed-hrone.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = resolve(__dirname, '../.env.local');
const envLines = readFileSync(envPath, 'utf8').split('\n');
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

const BASE      = process.env.HRONE_BASE_URL;
const ORG_ID    = process.env.HRONE_ORG_ID;
const APP_ID    = process.env.HRONE_APP_ID;
const EMAIL     = process.env.HRONE_EMAIL;
const PASSWORD  = process.env.HRONE_PASSWORD;
const OBJECT_ID = process.env.HRONE_OBJECT_ID;

// ── Auth ─────────────────────────────────────────────────────────────────────
async function login() {
  const res = await fetch(`${BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ username: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const cookies = res.headers.getSetCookie?.() ?? [];
  let accessToken = '';
  for (const c of cookies) {
    const [pair] = c.split(';');
    const eq = pair.indexOf('=');
    if (pair.slice(0, eq).trim() === 'access_token') accessToken = pair.slice(eq + 1).trim();
  }
  if (!accessToken) throw new Error('No access_token in login response');
  return accessToken;
}

function headers(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-org-id': ORG_ID,
    'x-app-id': APP_ID,
  };
}

async function apiGet(token, path) {
  const res = await fetch(`${BASE}${path}`, { headers: headers(token) });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GET ${path} → ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

async function apiPost(token, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${t.slice(0, 300)}`);
  }
  return res.json();
}

// ── Discover property IDs ────────────────────────────────────────────────────
async function getPropertyMap(token) {
  const res = await apiGet(token, `/api/objects/${OBJECT_ID}/properties`);
  const props = res.data ?? res.properties ?? res ?? [];
  const map = {};
  for (const p of props) {
    map[p.key ?? p.name] = p.id ?? p._id;
  }
  return map;
}

// ── Seed data ────────────────────────────────────────────────────────────────
const FEATURES = [
  // TRIAGE (15)
  { title: 'Need Address option in the Business Unit', status: 'triage', module: 'Core', reqFor: 'CXO', priority: 'Medium', reqType: 'Customer', votes: 35, tags: ['Customer'], targetRelease: '', releasedOn: null },
  { title: "When an employee is transferred from one entity to another, the system should automatically retrieve the employee's existing data from the previous em", status: 'triage', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 6, tags: ['Web','Product'], targetRelease: '2026-10-31', releasedOn: null },
  { title: 'Send reminder push notification should also be triggered on email. ( Email notification is required for send reminder )', status: 'triage', module: 'Core', reqFor: 'CXO', priority: 'Medium', reqType: 'Customer', votes: 0, tags: ['Web','Customer'], targetRelease: '', releasedOn: null },
  { title: 'Dashboard for Profile (Complete/Incomplete)', status: 'triage', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 37, tags: ['Customer'], targetRelease: '', releasedOn: null },
  { title: 'Custom Field needs to be visible on all the Report filter', status: 'triage', module: 'Core', reqFor: 'CXO', priority: 'High', reqType: 'Customer', votes: 34, tags: ['Web','Customer'], targetRelease: '', releasedOn: null },
  { title: 'Client want org chart to change as per their requirement As per the image attached.', status: 'triage', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Customer', votes: 8, tags: ['Web','Customer'], targetRelease: '', releasedOn: null },
  { title: 'Org Chart needs to be changed as per client top - MD then all the operational head (indian)and operations manager (Japanese) then division head Then m', status: 'triage', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Customer', votes: 32, tags: ['Web','Customer'], targetRelease: '', releasedOn: null },
  { title: 'All the email notification content needs to be changes as per Client for AR , Leave , OD , Absenteeism alert', status: 'triage', module: 'Time office', reqFor: 'Employees', priority: 'High', reqType: 'Customer', votes: 28, tags: ['Web','Customer'], targetRelease: '', releasedOn: null },
  { title: 'In Snapshot master Client require other blank field which can be used as per required and the same can be used for the policy mapping', status: 'triage', module: 'Core', reqFor: 'CXO', priority: 'High', reqType: 'Customer', votes: 27, tags: ['Web','Customer'], targetRelease: '', releasedOn: null },
  { title: 'Create link with Operations to Division (department is renamed as operation and Department as Division)', status: 'triage', module: 'Core', reqFor: 'CXO', priority: 'High', reqType: 'Customer', votes: 8, tags: ['Web','Customer'], targetRelease: '', releasedOn: null },
  { title: 'Upcoming joinee can submit form even though all mandatory documents are not uploaded by him/her. Father name editable even without clicking Edit butto', status: 'triage', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 5, tags: ['Customer'], targetRelease: '', releasedOn: null },
  { title: 'Workforce/Upcoming Joinee module must work smartly', status: 'triage', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 17, tags: ['Customer'], targetRelease: '', releasedOn: null },
  { title: 'Add Nominee Details section in Upcoming Joinee & Employee Profile section is not full proof', status: 'triage', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 7, tags: ['Customer'], targetRelease: '', releasedOn: null },
  { title: 'The current organization chart view is fixed as per the format decided by HROne', status: 'triage', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 13, tags: ['Customer'], targetRelease: '', releasedOn: null },
  { title: 'Organization Chart Bugs', status: 'triage', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 33, tags: ['Customer'], targetRelease: '', releasedOn: null },

  // PLANNED (8)
  { title: "Backend modification logs of the 'upcoming + new employee Profile' form required to identify and troubleshoot issues", status: 'planned', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 15, tags: ['Web','Success'], targetRelease: '2026-07-31', releasedOn: null },
  { title: 'We need an edit option in work-flow of resignation (after approved by all) as generally we have to extend the LWD & in that case we have only option t', status: 'planned', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Customer', votes: 31, tags: ['Web','Customer'], targetRelease: '2026-09-30', releasedOn: null },
  { title: 'Confirmation- User cannot be a self approver in a task.', status: 'planned', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 19, tags: ['Customer'], targetRelease: '2026-09-30', releasedOn: null },
  { title: 'Pop-up message or Lock Request option to employees to fill profile', status: 'planned', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 29, tags: ['Customer'], targetRelease: '2026-09-30', releasedOn: null },
  { title: "Snapshot History Report- Requested by & Approved by columns are incorrect", status: 'planned', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 33, tags: ['Customer'], targetRelease: '2026-09-30', releasedOn: null },
  { title: "Enable 'CC to' option while sharing the Offer Letter with 'DigiSign'", status: 'planned', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 26, tags: ['Web','Success'], targetRelease: '2026-09-30', releasedOn: null },
  { title: 'Notification is necessary before employees retire. A notification should be available with the HR at least a month prior to the retirement date of any', status: 'planned', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 34, tags: ['Customer'], targetRelease: '2026-09-30', releasedOn: null },
  { title: "While transferring entities from one entity to another, we do not wish to make any changes to the employee's tenure, leave benefits and balance, gratu", status: 'planned', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Customer', votes: 39, tags: ['Web','Customer'], targetRelease: '2026-09-30', releasedOn: null },

  // IN DEV (20)
  { title: 'PDF file for entire employee profile in printable format (Employee file)', status: 'indev', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 39, tags: ['Web','Product'], targetRelease: '2026-07-31', releasedOn: null },
  { title: 'Showing of Digital signature balance in Hrone', status: 'indev', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 31, tags: ['Customer'], targetRelease: '2026-07-31', releasedOn: null },
  { title: 'Esignature flexibility to move below designation as the header and footer is currently overlapping on the same', status: 'indev', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 1, tags: ['Customer'], targetRelease: '2026-10-31', releasedOn: null },
  { title: 'We need tab REMARKS whenever we are unpublishing any letters to add the important details for the future reference', status: 'indev', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 20, tags: ['Customer'], targetRelease: '2026-10-31', releasedOn: null },
  { title: "Need additional filters like Next 7 days, Next 15 days & Next month along with existing report in 'Resignation' report", status: 'indev', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 25, tags: ['Web','Success'], targetRelease: '2026-07-31', releasedOn: null },
  { title: 'Filter of active/inactive is required in Page & Data access', status: 'indev', module: 'Core', reqFor: 'CXO', priority: 'High', reqType: 'Customer', votes: 23, tags: ['Web','Customer'], targetRelease: '2026-07-31', releasedOn: null },
  { title: 'Conditional Workflow - 2 workflows require one for voluntary and one for involuntary (Termination - which hr will apply on behalf of employee)', status: 'indev', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 4, tags: ['Customer'], targetRelease: '2026-07-31', releasedOn: null },
  { title: 'Add a "Download BGV Report" option under page access to manage its access.', status: 'indev', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 17, tags: ['Web','Success'], targetRelease: '2026-07-31', releasedOn: null },
  { title: 'Complete data visible even after applying filters - For example, in the Headcount by Sub-branch report, employees from sub-branches that were excluded', status: 'indev', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 36, tags: ['Web','Success'], targetRelease: '2026-07-31', releasedOn: null },
  { title: 'Request to Update Employment Status and Type Options in HROne as Apprentice', status: 'indev', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 36, tags: ['Customer'], targetRelease: '2026-10-31', releasedOn: null },
  { title: 'Type & Search Option is required in Branch and Sub Branch ( Core > Location )', status: 'indev', module: 'Core', reqFor: 'CXO', priority: 'Medium', reqType: 'Customer', votes: 37, tags: ['Web','Customer'], targetRelease: '2026-07-31', releasedOn: null },
  { title: 'Candidate & Employee eKYC/DigiSign credit consumption details should be available within the product.', status: 'indev', module: 'Core', reqFor: 'CXO', priority: 'High', reqType: 'Internal', votes: 17, tags: ['Web','Success'], targetRelease: '2026-07-31', releasedOn: null },
  { title: 'A report required to track the number of e-sign completed by the employees for all letters', status: 'indev', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 22, tags: ['Web','Success'], targetRelease: '2026-07-31', releasedOn: null },
  { title: 'Proposed LWD columns to show in Resignation Report', status: 'indev', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 14, tags: ['Web','Customer'], targetRelease: '2026-07-31', releasedOn: null },
  { title: 'An intimation emailer to be sent to the HR once the e-sign is being completed by the employees.', status: 'indev', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 35, tags: ['Web','Success'], targetRelease: '2026-10-31', releasedOn: null },
  { title: 'Need the attached Employement application form for candidates', status: 'indev', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Customer', votes: 11, tags: ['Web','Customer'], targetRelease: '2026-07-31', releasedOn: null },
  { title: 'Enable Blacklist Reason and Comment in the Resignation Inbox form, similar to the Snapshot Update form when an employee is marked as blacklisted.', status: 'indev', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 31, tags: ['Web','Success'], targetRelease: '2026-10-31', releasedOn: null },
  { title: 'Employee other details and Dimension in Leave Encashment Provision, Gratuity Provision, PF Provision, ESI Provision, PT Provision', status: 'indev', module: 'Core', reqFor: 'CXO', priority: 'High', reqType: 'Internal', votes: 10, tags: ['Web','Success'], targetRelease: '2026-07-31', releasedOn: null },
  { title: 'Modification in Subject line of New Leave Request. Any update on New leave request should have a subject line- "Update on leave request for [Employee ', status: 'indev', module: 'Core', reqFor: 'CXO', priority: 'Medium', reqType: 'Customer', votes: 36, tags: ['Web','Customer'], targetRelease: '2026-10-31', releasedOn: null },
  { title: 'I want the detail of Reporting Manager in all the reports I download from HR-One.', status: 'indev', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 39, tags: ['Customer'], targetRelease: '2026-10-31', releasedOn: null },

  // RELEASED (25)
  { title: 'While converting upcoming join all the 9 steps which are supposed to be reviewed to be made mandatory.', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Customer', votes: 31, tags: ['Web','Customer'], targetRelease: '2026-07-31', releasedOn: '2026-07-31' },
  { title: 'Currently, while adding employee qualification details in the Education section, there is no field or marker to identify the highest qualification of ', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Customer', votes: 28, tags: ['Web','Customer'], targetRelease: '2026-08-05', releasedOn: '2026-08-05' },
  { title: "Restrict modification of the backdated 'Proposed Relieving Date' at the approver level when adjust LWD settings are enabled", status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 37, tags: ['Web','Success'], targetRelease: '', releasedOn: '2026-03-15' },
  { title: 'While scrolling down header of the forms not appearing on top', status: 'released', module: 'Core', reqFor: 'CXO', priority: 'Medium', reqType: 'Customer', votes: 32, tags: ['Customer'], targetRelease: '2026-07-31', releasedOn: '2026-07-31' },
  { title: 'Employee details must be reviewed, and for each TAB it should be mandatory to review before submitting. As of now it is non mandate(Upcoming joinee Ta', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 12, tags: ['Customer'], targetRelease: '2026-07-31', releasedOn: '2026-07-31' },
  { title: 'Duplicity check validation on custom fields on active employees only', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 36, tags: ['Web','Success'], targetRelease: '2026-05-31', releasedOn: '2026-05-31' },
  { title: 'Auto rejection of Resignation request if not attended by the Reporting Manager within 15 days from the date of submission', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 4, tags: ['Customer'], targetRelease: '2026-05-31', releasedOn: '2026-05-31' },
  { title: 'In Multi Factor Authentication feature, The OTP validation is mandatory for every login irrespective of browser/ app or frequency of login.', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 17, tags: ['Customer'], targetRelease: '2026-04-30', releasedOn: '2026-04-30' },
  { title: 'Need to increase the word limit in remarks under MISC Letters', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Customer', votes: 26, tags: ['Web','Customer'], targetRelease: '2026-04-30', releasedOn: '2026-04-30' },
  { title: 'Increasing character limitation of Co. code in Health Insurance', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 1, tags: ['Customer'], targetRelease: '2026-04-30', releasedOn: '2026-04-30' },
  { title: "If a sub-status category is selected in the checklist, it must be mandatory during the clearance task at the approver's end.", status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 10, tags: ['Web','Success'], targetRelease: '2026-04-30', releasedOn: '2026-04-30' },
  { title: 'eKYC mapping on roles, currently all available KYC mapped with all employees.', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Customer', votes: 37, tags: ['Web','Customer'], targetRelease: '2026-01-31', releasedOn: '2026-01-31' },
  { title: 'ekyc on whatsapp', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Customer', votes: 27, tags: ['Web','Customer'], targetRelease: '2026-01-31', releasedOn: '2026-01-31' },
  { title: 'In clearance we requires individual task owner delegate option. Currently all of the task delegated at once.', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Customer', votes: 7, tags: ['Web','Customer'], targetRelease: '2026-04-30', releasedOn: '2026-04-30' },
  { title: 'Client needs a cc option while generating the letters in the portal.', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Customer', votes: 1, tags: ['Web','Customer'], targetRelease: '2026-04-30', releasedOn: '2026-04-30' },
  { title: 'The relieving letter task should get generated post clearing the exit checklist from the system', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Customer', votes: 5, tags: ['Web','Customer'], targetRelease: '2026-04-30', releasedOn: '2026-04-30' },
  { title: 'There should be an option where employers can enable the functionality where all the emails going out from system should be marked to HR or a common D', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 29, tags: ['Customer'], targetRelease: '2026-07-31', releasedOn: '2026-07-31' },
  { title: "client does not want employee profiles to be publicly visible in the directory. However, they want reporting managers to have access to their own team", status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 21, tags: ['Customer'], targetRelease: '2026-04-30', releasedOn: '2026-04-30' },
  { title: 'Disable chat bot icon', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 32, tags: ['Customer'], targetRelease: '2026-04-30', releasedOn: '2026-04-30' },
  { title: 'Employee uploaded Signature Dump Download Request', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 9, tags: ['Web','Success'], targetRelease: '2026-02-28', releasedOn: '2026-02-28' },
  { title: 'Org wise experience tag', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 21, tags: ['Customer'], targetRelease: '', releasedOn: '2026-03-15' },
  { title: 'There shall be option to have only one signature in misc letter when it is signed through digital signature', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Customer', votes: 14, tags: ['Web','Customer'], targetRelease: '2026-02-28', releasedOn: '2026-02-28' },
  { title: 'The Job Description field is required for designation import (both Insert and Update types).', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 37, tags: ['Web','Success'], targetRelease: '2026-04-30', releasedOn: '2026-04-30' },
  { title: 'Employee status display in HRDesk search results', status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'Medium', reqType: 'Customer', votes: 27, tags: ['Customer'], targetRelease: '2026-01-31', releasedOn: '2026-01-31' },
  { title: "Same behavior required when updating 'Separated' and 'Widow/Widower' statuses as it does for 'Single' in the Marital Status add/update process", status: 'released', module: 'Workforce', reqFor: 'HR', priority: 'High', reqType: 'Internal', votes: 1, tags: ['Web','Success'], targetRelease: '2026-02-28', releasedOn: '2026-02-28' },
];

function dateToMs(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).getTime();
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Logging in to HROne Studio...');
  const token = await login();
  console.log('Authenticated ✓');

  // Discover properties
  console.log('Fetching property schema...');
  let propMap = {};
  try {
    propMap = await getPropertyMap(token);
    console.log('Properties found:', Object.keys(propMap).join(', '));
  } catch (e) {
    console.warn('Could not fetch properties:', e.message);
    console.log('Using hardcoded property IDs...');
  }

  // Fallback: known property IDs from app/api/features/route.ts
  const PROPS = {
    title:          propMap['title']          ?? '6a06c6bb63596c170f308827',
    status:         propMap['status']         ?? '6a06c73467e4cd9a17bb8469',
    priority:       propMap['priority']       ?? '6a06c75ecbb2f51885227982',
    req_type:       propMap['req_type']       ?? '6a06c75efb72a2b38392b220',
    req_for:        propMap['req_for']        ?? '6a06c75fcbb2f51885227983',
    module:         propMap['module']         ?? '6a06c75fa5fbef49b4a0114d',
    is_hot:         propMap['is_hot']         ?? '6a06c760971662c50b89992f',
    tags:           propMap['tags']           ?? '6a06c76163596c170f308828',
    target_release: propMap['target_release'] ?? '6a06c76237dd0e5c23dec1a5',
    votes:          propMap['votes']          ?? '6a06c78537dd0e5c23dec1a6',
    released_on:    propMap['released_on']    ?? '6a06c7a7971662c50b899934',
  };

  const ALL_PROP_IDS = Object.values(PROPS);

  let ok = 0, fail = 0;
  for (const f of FEATURES) {
    try {
      const values = [
        { propertyId: PROPS.title,          key: 'title',          value: f.title },
        { propertyId: PROPS.status,         key: 'status',         value: f.status },
        { propertyId: PROPS.priority,       key: 'priority',       value: f.priority },
        { propertyId: PROPS.req_type,       key: 'req_type',       value: f.reqType },
        { propertyId: PROPS.req_for,        key: 'req_for',        value: f.reqFor },
        { propertyId: PROPS.module,         key: 'module',         value: f.module },
        { propertyId: PROPS.is_hot,         key: 'is_hot',         value: [] },
        { propertyId: PROPS.tags,           key: 'tags',           value: f.tags },
        { propertyId: PROPS.votes,          key: 'votes',          value: f.votes },
      ];

      const targetMs = dateToMs(f.targetRelease);
      if (targetMs) values.push({ propertyId: PROPS.target_release, key: 'target_release', value: targetMs });

      const releasedMs = dateToMs(f.releasedOn);
      if (releasedMs) values.push({ propertyId: PROPS.released_on, key: 'released_on', value: releasedMs });

      await apiPost(token, `/api/objects/${OBJECT_ID}/records`, {
        values,
        propertyIds: ALL_PROP_IDS,
      });
      ok++;
      process.stdout.write(`\r[${ok + fail}/${FEATURES.length}] ✓ ${ok} seeded, ✗ ${fail} failed`);
    } catch (e) {
      fail++;
      console.error(`\nFailed: "${f.title.slice(0,60)}" → ${e.message}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n\nDone! ✓ ${ok} seeded, ✗ ${fail} failed`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
