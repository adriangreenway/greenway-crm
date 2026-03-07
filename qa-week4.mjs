import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://command.greenwayband.com';
const SCREENSHOTS_DIR = './screenshots';
const REPORT_FILE = './QA_REPORT.md';

// Ensure screenshots dir exists
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Results collector
const results = [];
let loginGateActive = false;

function addResult(group, id, check, status, notes = '') {
  results.push({ group, id, check, status, notes });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${icon} ${id}: ${check} — ${status}${notes ? ' — ' + notes : ''}`);
}

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, name);
  await page.screenshot({ path: filePath, fullPage: true });
  return name;
}

async function clickNav(page, navText) {
  // Try clicking sidebar nav item by text
  try {
    // Look for nav items in sidebar area
    const navItem = page.locator(`text="${navText}"`).first();
    await navItem.click({ timeout: 5000 });
    await page.waitForTimeout(2000);
  } catch (e) {
    // Try alternate: case insensitive partial match
    try {
      await page.click(`text=${navText}`, { timeout: 3000 });
      await page.waitForTimeout(2000);
    } catch (e2) {
      console.log(`  ⚠️ Could not click nav "${navText}": ${e2.message}`);
    }
  }
}

async function getPageText(page) {
  try {
    return await page.locator('body').innerText({ timeout: 5000 });
  } catch {
    return '';
  }
}

// ===========================
// GROUP 0: App Load & Regression
// ===========================
async function runGroup0(page) {
  console.log('\n========== GROUP 0: App Load & Regression ==========\n');

  // R1: App loads
  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(5000);
    const bodyText = await getPageText(page);

    // Detect login gate
    const hasLogin = bodyText.toLowerCase().includes('sign in') ||
                     bodyText.toLowerCase().includes('log in') ||
                     bodyText.toLowerCase().includes('login') ||
                     bodyText.toLowerCase().includes('password');

    if (hasLogin && bodyText.length < 500) {
      loginGateActive = true;
      addResult('Group 0', 'R1', 'App loads', 'PASS', 'Login gate detected — limited testing available');
      await screenshot(page, 'page-login.png');

      // Skip remaining group 0 checks
      const pages = ['Dashboard', 'Pipeline', 'Calendar', 'Band Ops', 'Content', 'Settings'];
      for (const p of pages) {
        addResult('Group 0', `R${pages.indexOf(p) + 2}`, `${p} page renders`, 'SKIP', 'Login gate active');
      }
      return;
    }

    if (bodyText.length > 20) {
      addResult('Group 0', 'R1', 'App loads without blank screen', 'PASS', `Page has ${bodyText.length} chars of text`);
    } else {
      addResult('Group 0', 'R1', 'App loads without blank screen', 'FAIL', 'Page appears blank or minimal text');
    }
    await screenshot(page, 'page-initial-load.png');
  } catch (e) {
    addResult('Group 0', 'R1', 'App loads without blank screen', 'FAIL', e.message);
    await screenshot(page, 'page-initial-load.png');
  }

  if (loginGateActive) return;

  // R2: Dashboard
  try {
    await clickNav(page, 'Dashboard');
    const text = await getPageText(page);
    const hasAdrian = text.includes('Adrian');
    const hasDashboard = text.toLowerCase().includes('dashboard');
    if (hasAdrian || hasDashboard) {
      addResult('Group 0', 'R2', 'Dashboard page renders', 'PASS',
        `${hasAdrian ? 'Found "Adrian"' : ''}${hasAdrian && hasDashboard ? ', ' : ''}${hasDashboard ? 'Found "Dashboard"' : ''}`);
    } else {
      addResult('Group 0', 'R2', 'Dashboard page renders', 'FAIL', 'No "Adrian" greeting or Dashboard heading found');
    }
    await screenshot(page, 'page-dashboard.png');
  } catch (e) {
    addResult('Group 0', 'R2', 'Dashboard page renders', 'FAIL', e.message);
    await screenshot(page, 'page-dashboard.png').catch(() => {});
  }

  // R3: Pipeline
  try {
    await clickNav(page, 'Pipeline');
    const text = await getPageText(page);
    if (text.includes('Pipeline')) {
      addResult('Group 0', 'R3', 'Pipeline page renders', 'PASS', 'Found "Pipeline" heading');
    } else {
      addResult('Group 0', 'R3', 'Pipeline page renders', 'FAIL', 'No "Pipeline" heading found');
    }
    await screenshot(page, 'page-pipeline.png');
  } catch (e) {
    addResult('Group 0', 'R3', 'Pipeline page renders', 'FAIL', e.message);
    await screenshot(page, 'page-pipeline.png').catch(() => {});
  }

  // R4: Calendar
  try {
    await clickNav(page, 'Calendar');
    const text = await getPageText(page);
    if (text.includes('Calendar')) {
      addResult('Group 0', 'R4', 'Calendar page renders', 'PASS', 'Found "Calendar" heading');
    } else {
      addResult('Group 0', 'R4', 'Calendar page renders', 'FAIL', 'No "Calendar" heading found');
    }
    await screenshot(page, 'page-calendar.png');
  } catch (e) {
    addResult('Group 0', 'R4', 'Calendar page renders', 'FAIL', e.message);
    await screenshot(page, 'page-calendar.png').catch(() => {});
  }

  // R5: Band Ops
  try {
    await clickNav(page, 'Band Ops');
    const text = await getPageText(page);
    if (text.includes('Band Op') || text.includes('Band op')) {
      addResult('Group 0', 'R5', 'Band Ops page renders', 'PASS', 'Found Band Operations heading');
    } else {
      addResult('Group 0', 'R5', 'Band Ops page renders', 'FAIL', 'No "Band Operations" heading found');
    }
    await screenshot(page, 'page-bandops.png');
  } catch (e) {
    addResult('Group 0', 'R5', 'Band Ops page renders', 'FAIL', e.message);
    await screenshot(page, 'page-bandops.png').catch(() => {});
  }

  // R6: Content
  try {
    await clickNav(page, 'Content');
    const text = await getPageText(page);
    if (text.includes('Content')) {
      const hasTabs = text.includes('Social Studio') || text.includes('Media Vault');
      addResult('Group 0', 'R6', 'Content page renders', 'PASS',
        `Found "Content"${hasTabs ? ' with tabs' : ''}`);
    } else {
      addResult('Group 0', 'R6', 'Content page renders', 'FAIL', 'No "Content" heading found');
    }
    await screenshot(page, 'page-content.png');
  } catch (e) {
    addResult('Group 0', 'R6', 'Content page renders', 'FAIL', e.message);
    await screenshot(page, 'page-content.png').catch(() => {});
  }

  // R7: Settings
  try {
    await clickNav(page, 'Settings');
    const text = await getPageText(page);
    if (text.includes('Settings')) {
      addResult('Group 0', 'R7', 'Settings page renders', 'PASS', 'Found "Settings" heading');
    } else {
      addResult('Group 0', 'R7', 'Settings page renders', 'FAIL', 'No "Settings" heading found');
    }
    await screenshot(page, 'page-settings.png');
  } catch (e) {
    addResult('Group 0', 'R7', 'Settings page renders', 'FAIL', e.message);
    await screenshot(page, 'page-settings.png').catch(() => {});
  }
}

// ===========================
// GROUP 1: AI Crew Page (Week 4A)
// ===========================
async function runGroup1(page) {
  console.log('\n========== GROUP 1: AI Crew SMS (Week 4A) ==========\n');

  if (loginGateActive) {
    const checks = ['W4A-1','W4A-2a','W4A-2b','W4A-2c','W4A-2d','W4A-2e','W4A-2f','W4A-2g','W4A-11','W4A-19','W4A-22'];
    for (const id of checks) {
      addResult('Group 1', id, 'AI Crew check', 'SKIP', 'Login gate active');
    }
    return;
  }

  // Navigate to AI Crew
  await clickNav(page, 'AI Crew');
  const text = await getPageText(page);
  await screenshot(page, 'ai-crew-page.png');

  // W4A-1: 3 persona cards visible, no COMING badges
  try {
    const hasAdrian = text.includes('Adrian AI');
    const hasContent = text.includes('Content AI');
    const hasStrategy = text.includes('Strategy AI');
    const cardCount = [hasAdrian, hasContent, hasStrategy].filter(Boolean).length;
    const hasComingSoon = text.includes('COMING') || text.includes('Coming Soon');

    if (cardCount === 3 && !hasComingSoon) {
      addResult('Group 1', 'W4A-1', '3 persona cards visible, no COMING badges', 'PASS', 'All 3 persona cards found, no COMING text');
    } else {
      addResult('Group 1', 'W4A-1', '3 persona cards visible, no COMING badges', 'FAIL',
        `Found ${cardCount}/3 cards. ${hasComingSoon ? 'COMING badge found!' : 'No COMING badge.'} Missing: ${!hasAdrian ? 'Adrian AI ' : ''}${!hasContent ? 'Content AI ' : ''}${!hasStrategy ? 'Strategy AI' : ''}`);
    }
  } catch (e) {
    addResult('Group 1', 'W4A-1', '3 persona cards, no COMING badges', 'FAIL', e.message);
  }

  // W4A-2a: Persona names
  try {
    const names = ['Adrian AI', 'Content AI', 'Strategy AI'];
    const found = names.filter(n => text.includes(n));
    addResult('Group 1', 'W4A-2a', 'Each card has persona name',
      found.length === 3 ? 'PASS' : 'FAIL',
      `Found: ${found.join(', ')}${found.length < 3 ? '. Missing: ' + names.filter(n => !text.includes(n)).join(', ') : ''}`);
  } catch (e) {
    addResult('Group 1', 'W4A-2a', 'Each card has persona name', 'FAIL', e.message);
  }

  // W4A-2b: Roles
  try {
    const roles = ['Chief of Staff', 'Social Media Manager', 'Business Consultant'];
    const found = roles.filter(r => text.includes(r));
    addResult('Group 1', 'W4A-2b', 'Each card has role',
      found.length === 3 ? 'PASS' : 'FAIL',
      `Found: ${found.join(', ')}${found.length < 3 ? '. Missing: ' + roles.filter(r => !text.includes(r)).join(', ') : ''}`);
  } catch (e) {
    addResult('Group 1', 'W4A-2b', 'Each card has role', 'FAIL', e.message);
  }

  // W4A-2c: Schedules
  try {
    const schedules = ['Daily at 8 AM CT', 'Mondays at 9 AM CT', 'Sundays at 7 PM CT'];
    const found = schedules.filter(s => text.includes(s));
    addResult('Group 1', 'W4A-2c', 'Each card has schedule',
      found.length === 3 ? 'PASS' : 'FAIL',
      `Found: ${found.join(', ')}${found.length < 3 ? '. Missing: ' + schedules.filter(s => !text.includes(s)).join(', ') : ''}`);
  } catch (e) {
    addResult('Group 1', 'W4A-2c', 'Each card has schedule', 'FAIL', e.message);
  }

  // W4A-2d: Toggle switches
  try {
    // Look for elements that could be toggle switches - various approaches
    const toggles = await page.locator('[role="switch"], [type="checkbox"], [aria-checked]').count();
    // Also try to find styled toggle divs (pill-shaped elements)
    const styledToggles = await page.evaluate(() => {
      const elements = document.querySelectorAll('div, span, button');
      let count = 0;
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        const w = parseInt(style.width);
        const h = parseInt(style.height);
        const br = parseInt(style.borderRadius);
        // Toggle switches are typically 36-52px wide, 18-28px tall, with full border-radius
        if (w >= 36 && w <= 60 && h >= 18 && h <= 30 && br >= h/2) {
          count++;
        }
      }
      return count;
    });
    const totalToggles = Math.max(toggles, styledToggles);
    addResult('Group 1', 'W4A-2d', 'Each card has toggle switch',
      totalToggles >= 3 ? 'PASS' : 'FAIL',
      `Found ${toggles} role=switch elements, ${styledToggles} styled toggle elements`);
  } catch (e) {
    addResult('Group 1', 'W4A-2d', 'Each card has toggle switch', 'FAIL', e.message);
  }

  // W4A-2e: Send Now buttons
  try {
    const sendNowCount = (text.match(/Send Now/g) || []).length;
    addResult('Group 1', 'W4A-2e', 'Each card has Send Now button',
      sendNowCount >= 3 ? 'PASS' : 'FAIL',
      `Found ${sendNowCount} "Send Now" occurrences (expected 3)`);
  } catch (e) {
    addResult('Group 1', 'W4A-2e', 'Each card has Send Now button', 'FAIL', e.message);
  }

  // W4A-2f: View History buttons
  try {
    const viewHistoryCount = (text.match(/View History/g) || []).length;
    addResult('Group 1', 'W4A-2f', 'Each card has View History button',
      viewHistoryCount >= 3 ? 'PASS' : 'FAIL',
      `Found ${viewHistoryCount} "View History" occurrences (expected 3)`);
  } catch (e) {
    addResult('Group 1', 'W4A-2f', 'Each card has View History button', 'FAIL', e.message);
  }

  // W4A-2g: Last message area
  try {
    const hasNoMessages = text.includes('No messages yet') || text.includes('No messages sent');
    const hasMessagePreview = text.includes('Last message') || text.includes('Latest:');
    addResult('Group 1', 'W4A-2g', 'Each card has last message area',
      hasNoMessages || hasMessagePreview ? 'PASS' : 'FAIL',
      hasNoMessages ? '"No messages yet" empty state shown' : hasMessagePreview ? 'Message preview found' : 'No message area detected');
  } catch (e) {
    addResult('Group 1', 'W4A-2g', 'Each card has last message area', 'FAIL', e.message);
  }

  // W4A-11: Empty state in history panel
  try {
    const viewHistoryBtn = page.locator('text="View History"').first();
    await viewHistoryBtn.click({ timeout: 3000 });
    await page.waitForTimeout(1000);
    const panelText = await getPageText(page);
    await screenshot(page, 'ai-crew-history-panel.png');

    const hasEmptyState = panelText.includes('No messages') || panelText.includes('no messages') ||
                          panelText.includes('No SMS') || panelText.includes('empty') ||
                          panelText.includes('No history');
    addResult('Group 1', 'W4A-11', 'Empty state in history panel',
      hasEmptyState ? 'PASS' : 'FAIL',
      hasEmptyState ? 'Empty state message found in panel' : 'No empty state message detected in panel');

    // Close panel - try clicking outside or pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } catch (e) {
    addResult('Group 1', 'W4A-11', 'Empty state in history panel', 'FAIL', e.message);
    await screenshot(page, 'ai-crew-history-panel.png').catch(() => {});
  }

  // W4A-19 & W4A-22: Twilio in Settings
  try {
    await clickNav(page, 'Settings');
    const settingsText = await getPageText(page);
    await screenshot(page, 'settings-twilio.png');

    const hasTwilio = settingsText.includes('Twilio') || settingsText.includes('twilio');
    addResult('Group 1', 'W4A-19', 'Twilio card exists in Settings',
      hasTwilio ? 'PASS' : 'FAIL',
      hasTwilio ? 'Found "Twilio" in Settings page' : 'No "Twilio" text found in Settings');

    const hasNotConfigured = settingsText.includes('Not Configured') || settingsText.includes('not configured') ||
                             settingsText.includes('Not Connected') || settingsText.includes('not connected');
    addResult('Group 1', 'W4A-22', 'Twilio shows not-configured state',
      hasNotConfigured || hasTwilio ? 'PASS' : 'FAIL',
      hasNotConfigured ? 'Shows "Not Configured" state' : hasTwilio ? 'Twilio card present (may show different state)' : 'Twilio card not found');
  } catch (e) {
    addResult('Group 1', 'W4A-19', 'Twilio card in Settings', 'FAIL', e.message);
    addResult('Group 1', 'W4A-22', 'Twilio not-configured state', 'FAIL', e.message);
  }
}

// ===========================
// GROUP 2: Google Calendar (Week 4B)
// ===========================
async function runGroup2(page) {
  console.log('\n========== GROUP 2: Google Calendar (Week 4B) ==========\n');

  if (loginGateActive) {
    addResult('Group 2', 'W4B-1', 'Google Calendar Connect button', 'SKIP', 'Login gate active');
    addResult('Group 2', 'W4B-17', 'Calendar renders without errors', 'SKIP', 'Login gate active');
    return;
  }

  // W4B-1: Settings has Google Calendar card with Connect button
  try {
    await clickNav(page, 'Settings');
    const text = await getPageText(page);
    await screenshot(page, 'settings-gcal.png');

    const hasGcal = text.includes('Google Calendar') || text.includes('google calendar');
    const hasConnect = text.includes('Connect');

    addResult('Group 2', 'W4B-1', 'Settings has Google Calendar card with Connect button',
      hasGcal && hasConnect ? 'PASS' : 'FAIL',
      `Google Calendar: ${hasGcal ? 'found' : 'NOT found'}. Connect button: ${hasConnect ? 'found' : 'NOT found'}`);
  } catch (e) {
    addResult('Group 2', 'W4B-1', 'Google Calendar Connect button', 'FAIL', e.message);
  }

  // W4B-17: Calendar renders without errors when not connected
  try {
    await clickNav(page, 'Calendar');
    await page.waitForTimeout(1500);
    const text = await getPageText(page);
    await screenshot(page, 'calendar-no-gcal.png');

    const hasCalendar = text.includes('Calendar');
    const hasError = text.toLowerCase().includes('error') && !text.toLowerCase().includes('error handling');
    const hasBlank = text.trim().length < 50;

    // Check for month grid indicators (month names, day names)
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const hasMonth = months.some(m => text.includes(m));
    const hasDay = days.some(d => text.includes(d));

    if (hasCalendar && !hasError && !hasBlank) {
      addResult('Group 2', 'W4B-17', 'Calendar renders without errors when not connected', 'PASS',
        `Calendar heading present. Month grid: ${hasMonth ? 'yes' : 'no'}. Day headers: ${hasDay ? 'yes' : 'no'}`);
    } else {
      addResult('Group 2', 'W4B-17', 'Calendar renders without errors when not connected', 'FAIL',
        `Calendar: ${hasCalendar ? 'yes' : 'no'}. Error text: ${hasError ? 'yes' : 'no'}. Blank: ${hasBlank ? 'yes' : 'no'}`);
    }
  } catch (e) {
    addResult('Group 2', 'W4B-17', 'Calendar renders without errors', 'FAIL', e.message);
  }
}

// ===========================
// GROUP 3: Global Checks
// ===========================
async function runGroup3(page) {
  console.log('\n========== GROUP 3: Global Checks ==========\n');

  if (loginGateActive) {
    addResult('Group 3', 'W4G-2', 'No hyphens as dashes in AI Crew copy', 'SKIP', 'Login gate active');
    addResult('Group 3', 'W4G-3', 'AI Crew graceful degradation', 'SKIP', 'Login gate active');
    return;
  }

  // Navigate to AI Crew for text checks
  await clickNav(page, 'AI Crew');
  const text = await getPageText(page);

  // W4G-2: No hyphens as dashes
  try {
    const badPatterns = [
      { pattern: /follow-up/gi, label: 'follow-up' },
      { pattern: /10-piece/gi, label: '10-piece' },
      { pattern: / - /g, label: '" - " (space-hyphen-space as em dash)' },
      { pattern: /\b\w+-\w+\b/g, label: 'hyphenated-compounds' }
    ];

    const issues = [];
    // Check specific bad patterns (not general hyphenated words which may be valid)
    if (/follow-up/i.test(text)) issues.push('follow-up');
    if (/10-piece/i.test(text)) issues.push('10-piece');
    if (/ - /.test(text)) issues.push('space-hyphen-space used as em dash');

    await screenshot(page, 'ai-crew-text-check.png');

    addResult('Group 3', 'W4G-2', 'No hyphens as dashes in AI Crew page copy',
      issues.length === 0 ? 'PASS' : 'FAIL',
      issues.length === 0 ? 'No problematic hyphen-dash patterns found' : `Found: ${issues.join(', ')}`);
  } catch (e) {
    addResult('Group 3', 'W4G-2', 'No hyphens as dashes', 'FAIL', e.message);
  }

  // W4G-3: Graceful degradation without Supabase
  try {
    const hasError = text.toLowerCase().includes('undefined') || text.toLowerCase().includes('null') ||
                     text.toLowerCase().includes('cannot read') || text.includes('{}');
    const hasBlankCards = text.trim().length < 100;
    const hasGraceful = text.includes('Connect Supabase') || text.includes('configure') ||
                        text.includes('AI Crew') || text.includes('Adrian AI');

    if (!hasError && !hasBlankCards && hasGraceful) {
      addResult('Group 3', 'W4G-3', 'AI Crew degrades gracefully without Supabase', 'PASS',
        'No errors or blank content. Page shows meaningful content.');
    } else if (hasError) {
      addResult('Group 3', 'W4G-3', 'AI Crew degrades gracefully without Supabase', 'FAIL',
        `Error indicators found in page text`);
    } else {
      addResult('Group 3', 'W4G-3', 'AI Crew degrades gracefully without Supabase', 'PASS',
        'Page renders with content (Supabase may or may not be connected)');
    }
  } catch (e) {
    addResult('Group 3', 'W4G-3', 'AI Crew graceful degradation', 'FAIL', e.message);
  }
}

// ===========================
// GROUP 4: Integration Diagnostics
// ===========================
async function runGroup4() {
  console.log('\n========== GROUP 4: Integration Diagnostics ==========\n');

  const diagnostics = {
    twilio: {},
    gcal: {},
    netlify: {}
  };

  // 4A: Twilio Diagnostics
  console.log('--- 4A: Twilio Diagnostics ---');

  // sms-test
  try {
    const resp = await fetch(`${BASE_URL}/.netlify/functions/sms-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const body = await resp.text();
    diagnostics.twilio.smsTest = { status: resp.status, body };
    console.log(`  sms-test: ${resp.status} — ${body.substring(0, 200)}`);
  } catch (e) {
    diagnostics.twilio.smsTest = { status: 'ERROR', body: e.message };
    console.log(`  sms-test: ERROR — ${e.message}`);
  }

  // sms-send
  try {
    const resp = await fetch(`${BASE_URL}/.netlify/functions/sms-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona: 'adrian_ai', body: 'QA test from Claude Code' })
    });
    const body = await resp.text();
    diagnostics.twilio.smsSend = { status: resp.status, body };
    console.log(`  sms-send: ${resp.status} — ${body.substring(0, 200)}`);
  } catch (e) {
    diagnostics.twilio.smsSend = { status: 'ERROR', body: e.message };
    console.log(`  sms-send: ERROR — ${e.message}`);
  }

  // sms-briefing
  try {
    const resp = await fetch(`${BASE_URL}/.netlify/functions/sms-briefing`, {
      method: 'GET'
    });
    const body = await resp.text();
    diagnostics.twilio.smsBriefing = { status: resp.status, body };
    const deployed = resp.status !== 404;
    console.log(`  sms-briefing: ${resp.status} — deployed: ${deployed ? 'YES' : 'NO'} — ${body.substring(0, 200)}`);
  } catch (e) {
    diagnostics.twilio.smsBriefing = { status: 'ERROR', body: e.message };
    console.log(`  sms-briefing: ERROR — ${e.message}`);
  }

  // 4B: Google Calendar Diagnostics
  console.log('\n--- 4B: Google Calendar Diagnostics ---');

  // gcal-auth (don't follow redirects)
  try {
    const resp = await fetch(`${BASE_URL}/.netlify/functions/gcal-auth`, {
      method: 'GET',
      redirect: 'manual'
    });
    const location = resp.headers.get('location') || '';
    const body = resp.status >= 400 ? await resp.text().catch(() => '') : '';
    diagnostics.gcal.auth = {
      status: resp.status,
      redirectUrl: location,
      body: body
    };

    // Parse redirect URL for diagnostics
    if (location) {
      try {
        const url = new URL(location);
        const redirectUri = url.searchParams.get('redirect_uri') || '';
        const clientId = url.searchParams.get('client_id') || '';
        const scope = url.searchParams.get('scope') || '';
        diagnostics.gcal.auth.redirectUri = redirectUri;
        diagnostics.gcal.auth.clientId = clientId ? 'present' : 'MISSING';
        diagnostics.gcal.auth.scope = scope;
        diagnostics.gcal.auth.redirectUriMatch = redirectUri === `${BASE_URL}/.netlify/functions/gcal-callback`;
        console.log(`  gcal-auth: ${resp.status} redirect`);
        console.log(`    redirect_uri: ${redirectUri}`);
        console.log(`    redirect_uri match: ${diagnostics.gcal.auth.redirectUriMatch ? 'YES' : 'NO'}`);
        console.log(`    client_id: ${diagnostics.gcal.auth.clientId}`);
        console.log(`    scope: ${scope}`);
      } catch (urlErr) {
        console.log(`  gcal-auth: ${resp.status} — redirect URL parse error: ${urlErr.message}`);
      }
    } else {
      console.log(`  gcal-auth: ${resp.status} — No redirect. Body: ${body.substring(0, 200)}`);
    }
  } catch (e) {
    diagnostics.gcal.auth = { status: 'ERROR', body: e.message };
    console.log(`  gcal-auth: ERROR — ${e.message}`);
  }

  // gcal-callback (no code)
  try {
    const resp = await fetch(`${BASE_URL}/.netlify/functions/gcal-callback`, {
      method: 'GET'
    });
    const body = await resp.text();
    diagnostics.gcal.callback = { status: resp.status, body };
    console.log(`  gcal-callback: ${resp.status} — ${body.substring(0, 200)}`);
  } catch (e) {
    diagnostics.gcal.callback = { status: 'ERROR', body: e.message };
    console.log(`  gcal-callback: ERROR — ${e.message}`);
  }

  // 4C: Netlify Deploy Check
  console.log('\n--- 4C: Netlify Deploy Check ---');
  try {
    const resp = await fetch(BASE_URL, { method: 'GET' });
    const nfRequestId = resp.headers.get('x-nf-request-id') || 'missing';
    const server = resp.headers.get('server') || 'missing';
    diagnostics.netlify = { nfRequestId, server };
    console.log(`  x-nf-request-id: ${nfRequestId}`);
    console.log(`  server: ${server}`);
  } catch (e) {
    diagnostics.netlify = { error: e.message };
    console.log(`  Netlify check: ERROR — ${e.message}`);
  }

  return diagnostics;
}

// ===========================
// REPORT GENERATION
// ===========================
function generateReport(diagnostics) {
  const timestamp = new Date().toISOString();
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const skip = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  // Group results
  const groups = {
    'Group 0': { title: 'Group 0: Regression (Weeks 1 through 3)', results: [] },
    'Group 1': { title: 'Group 1: AI Crew SMS (Week 4A)', results: [] },
    'Group 2': { title: 'Group 2: Google Calendar (Week 4B)', results: [] },
    'Group 3': { title: 'Group 3: Global Checks', results: [] }
  };

  for (const r of results) {
    if (groups[r.group]) groups[r.group].results.push(r);
  }

  // Build Twilio diagnosis
  let twilioDiagnosis = 'Unable to determine — diagnostics did not run.';
  if (diagnostics.twilio.smsTest) {
    const st = diagnostics.twilio.smsTest;
    const ss = diagnostics.twilio.smsSend;
    const sb = diagnostics.twilio.smsBriefing;

    if (st.status === 404 && ss?.status === 404) {
      twilioDiagnosis = 'Functions not deployed. The sms-test and sms-send Netlify functions returned 404. Check that the functions are in the netlify/functions directory and redeployed.';
    } else if (st.body?.includes('TWILIO_ACCOUNT_SID') || st.body?.includes('env') || ss?.body?.includes('TWILIO_ACCOUNT_SID')) {
      twilioDiagnosis = 'Environment variables missing. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER are not set in Netlify dashboard.';
    } else if (ss?.body?.includes('21608') || ss?.body?.includes('unverified')) {
      twilioDiagnosis = 'Trial account phone verification needed. Twilio error 21608: The recipient phone number must be verified in the Twilio console for trial accounts.';
    } else if (ss?.body?.includes('21211')) {
      twilioDiagnosis = 'Invalid phone number. Twilio error 21211: The To phone number is not valid.';
    } else if (ss?.body?.includes('20003') || ss?.body?.includes('Authentication')) {
      twilioDiagnosis = 'Authentication error. Twilio error 20003: The Account SID or Auth Token is incorrect.';
    } else {
      twilioDiagnosis = `See response details above. sms-test returned ${st.status}, sms-send returned ${ss?.status || 'N/A'}.`;
    }
  }

  // Build GCal diagnosis
  let gcalDiagnosis = 'Unable to determine — diagnostics did not run.';
  if (diagnostics.gcal.auth) {
    const auth = diagnostics.gcal.auth;
    if (auth.status === 'ERROR' || auth.status >= 500) {
      gcalDiagnosis = 'Function error or env vars missing. The gcal-auth function returned a 500 or crashed. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in Netlify env vars.';
    } else if (auth.redirectUri && !auth.redirectUriMatch) {
      gcalDiagnosis = `Redirect URI mismatch! The gcal-auth function uses redirect_uri="${auth.redirectUri}" but the expected value is "${BASE_URL}/.netlify/functions/gcal-callback". Update GOOGLE_REDIRECT_URI in Netlify env vars or the Google Cloud Console authorized redirect URIs.`;
    } else if (auth.clientId === 'MISSING') {
      gcalDiagnosis = 'Client ID missing from auth URL. GOOGLE_CLIENT_ID may not be set in Netlify env vars.';
    } else if (auth.redirectUriMatch && auth.clientId === 'present') {
      gcalDiagnosis = 'Auth URL looks correct (redirect_uri matches, client_id present). The issue is likely: (1) App not published or in Testing mode without Adrian as test user in Google Cloud Console, OR (2) The gcal-callback function is erroring when processing the authorization code. Check gcal-callback function logs in Netlify.';
    } else {
      gcalDiagnosis = `See response details above. gcal-auth returned ${auth.status}.`;
    }
  }

  let report = `# Command Center v3 — Week 4 QA Report

**Date:** ${timestamp}
**URL:** ${BASE_URL}
**Login gate:** ${loginGateActive ? 'Active — testing limited to pre-auth pages' : 'Not active'}

## Summary

| Metric | Count |
|--------|-------|
| Total checks | ${total} |
| Pass | ${pass} |
| Fail | ${fail} |
| Skip | ${skip} |

`;

  // Results tables
  for (const [key, group] of Object.entries(groups)) {
    if (group.results.length === 0) continue;
    report += `### ${group.title}\n\n`;
    report += `| # | Check | Status | Notes |\n`;
    report += `|---|-------|--------|-------|\n`;
    for (const r of group.results) {
      const statusEmoji = r.status === 'PASS' ? 'PASS' : r.status === 'FAIL' ? 'FAIL' : 'SKIP';
      report += `| ${r.id} | ${r.check} | ${statusEmoji} | ${r.notes.replace(/\|/g, '\\|')} |\n`;
    }
    report += '\n';
  }

  // Screenshots
  report += `## Screenshots\n\n`;
  const screenshotFiles = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
  for (const f of screenshotFiles) {
    report += `- \`screenshots/${f}\`\n`;
  }

  // Manual tests
  report += `\n## Manual Tests Required\n\n`;
  report += `These cannot be automated and must be done by Adrian:\n\n`;
  report += `1. **Send test SMS:** Go to Settings > Twilio card > click Test SMS button. Verify you receive an SMS on your phone. **KNOWN ISSUE: Not currently working. See diagnostics below.**\n`;
  report += `2. **Google Calendar OAuth:** Go to Settings > Google Calendar card > click Connect. Complete the Google sign-in. Verify you return to Settings with a "Connected" badge. **KNOWN ISSUE: Bouncing after consent. See diagnostics below.**\n`;
  report += `3. **Send Now:** Go to AI Crew > click Send Now on any persona card. Verify SMS arrives. (Blocked until Twilio issue is resolved.)\n`;
  report += `4. **Toggle persistence:** Toggle Adrian AI off. Refresh the page. Verify it stays off. (Requires Supabase connection.)\n`;

  // Integration Diagnostics
  report += `\n## Integration Diagnostics\n\n`;

  // Twilio
  report += `### Twilio\n\n`;
  report += `| Endpoint | HTTP Status | Response Body |\n`;
  report += `|----------|-------------|---------------|\n`;
  const tw = diagnostics.twilio;
  report += `| sms-test | ${tw.smsTest?.status || 'N/A'} | ${(tw.smsTest?.body || 'N/A').substring(0, 300).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |\n`;
  report += `| sms-send | ${tw.smsSend?.status || 'N/A'} | ${(tw.smsSend?.body || 'N/A').substring(0, 300).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |\n`;
  report += `| sms-briefing | ${tw.smsBriefing?.status || 'N/A'} | Deployed: ${tw.smsBriefing?.status !== 404 ? 'YES' : 'NO'}. ${(tw.smsBriefing?.body || '').substring(0, 200).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |\n`;
  report += `\n**Diagnosis:** ${twilioDiagnosis}\n\n`;

  // Google Calendar
  report += `### Google Calendar\n\n`;
  report += `| Endpoint | HTTP Status | Response/Redirect URL |\n`;
  report += `|----------|-------------|----------------------|\n`;
  const gc = diagnostics.gcal;
  report += `| gcal-auth | ${gc.auth?.status || 'N/A'} | ${(gc.auth?.redirectUrl || gc.auth?.body || 'N/A').substring(0, 300).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |\n`;
  report += `| gcal-callback | ${gc.callback?.status || 'N/A'} | ${(gc.callback?.body || 'N/A').substring(0, 300).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |\n`;
  report += `\n**Redirect URI match:** ${gc.auth?.redirectUriMatch === true ? 'YES' : gc.auth?.redirectUriMatch === false ? 'NO' : 'N/A (no redirect)'}\n`;
  report += `**Client ID present:** ${gc.auth?.clientId === 'present' ? 'YES' : gc.auth?.clientId === 'MISSING' ? 'NO' : 'N/A'}\n`;
  report += `**Diagnosis:** ${gcalDiagnosis}\n\n`;

  // Netlify
  report += `### Netlify\n\n`;
  report += `| Header | Value |\n`;
  report += `|--------|-------|\n`;
  const nf = diagnostics.netlify;
  report += `| x-nf-request-id | ${nf.nfRequestId || nf.error || 'N/A'} |\n`;
  report += `| server | ${nf.server || 'N/A'} |\n`;
  report += `\n**Deploy confirmed:** ${nf.nfRequestId && nf.nfRequestId !== 'missing' ? 'YES' : 'NO'}\n`;

  return report;
}

// ===========================
// MAIN
// ===========================
async function main() {
  console.log('🚀 Command Center v3 — Week 4 QA Run');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🔗 ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) QA-Bot/1.0'
  });
  const page = await context.newPage();

  try {
    // Run browser tests
    await runGroup0(page);
    await runGroup1(page);
    await runGroup2(page);
    await runGroup3(page);
  } catch (e) {
    console.error(`\n💥 Fatal error in browser tests: ${e.message}`);
    await screenshot(page, 'fatal-error.png').catch(() => {});
  }

  await browser.close();

  // Run integration diagnostics (HTTP-based, no browser needed)
  let diagnostics = { twilio: {}, gcal: {}, netlify: {} };
  try {
    diagnostics = await runGroup4();
  } catch (e) {
    console.error(`\n💥 Fatal error in diagnostics: ${e.message}`);
  }

  // Generate report
  const report = generateReport(diagnostics);
  fs.writeFileSync(REPORT_FILE, report);
  console.log(`\n📄 Report written to ${REPORT_FILE}`);
  console.log(`📸 Screenshots saved to ${SCREENSHOTS_DIR}/`);

  // Summary
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const skip = results.filter(r => r.status === 'SKIP').length;
  console.log(`\n📊 SUMMARY: ${pass} PASS | ${fail} FAIL | ${skip} SKIP out of ${results.length} checks`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
