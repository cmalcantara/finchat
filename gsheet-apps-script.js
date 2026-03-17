/**
 * FinChat Google Apps Script
 *
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire script, replacing the default code
 * 4. Set SHEET_NAME to the tab name where transactions should go
 * 5. Optionally set SECRET to match what you set in FinChat Settings
 * 6. Click Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone   ← MUST be "Anyone", not "Anyone with Google account"
 * 7. Copy the deployment URL and paste it into FinChat Settings > Google Sheets
 * 8. Authorize when prompted
 *
 * NOTE: This script uses getActiveSpreadsheet() — it must be a container-bound
 * script (created via Extensions > Apps Script from inside the Google Sheet).
 * Do NOT use it as a standalone script.
 *
 * Sheet layout expected:
 *   - Rows 1–4: your own headers/formatting (untouched)
 *   - Row 5 onwards: data inserted here (newest on top)
 *   - Columns: B=Date, C=Debit, D=Debit Category, E=Credit, F=Credit Category,
 *               G=Account, H=Balance, I=Description, J=Receipts
 *
 * To redeploy after editing: Deploy > Manage deployments > edit (pencil) > New version > Deploy
 */

const SHEET_NAME = 'Transactions';
const SECRET = ''; // Leave empty to disable, or match FinChat Settings

// Timezone for date formatting — change to your local timezone
// Full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
const TIMEZONE = 'Asia/Manila';

// Data starts at this row (rows above are reserved for your own headers)
const DATA_START_ROW = 5;

// Data starts at this column (2 = column B)
const DATA_START_COL = 2;

// Number of data columns: B C D E F G H I J = 9
const NUM_COLS = 9;

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    if (SECRET && payload.secret !== SECRET) {
      return json({ error: 'Unauthorized' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    const rows = payload.transactions || [];
    if (rows.length === 0) {
      return json({ ok: true, added: 0 });
    }

    // Expand transactions into sheet rows.
    // Transfers become two rows: one outflow (credit column) and one inflow (debit column).
    const values = [];
    for (const row of rows) {
      const date = formatTimestamp(row.timestamp);
      const desc = row.description || '';
      const receipt = row.receipt || '';

      const isTransfer = row.debit !== '' && row.credit !== '';
      if (isTransfer) {
        const amt = Number(row.debit); // positive amount
        const fromAccount = row.account;
        const toAccount = row.debitCategory; // sync encodes toAccount name here
        // Outflow from source account (credit column, negative = subtracted, same convention as expenses)
        values.push([date, '', '', -amt, 'Transfer', fromAccount, '', desc, receipt]);
        // Inflow to destination account (debit column, same convention as income)
        values.push([date, amt, 'Transfer', '', '', toAccount, '', desc, receipt]);
      } else {
        values.push([
          date,
          row.debit === '' ? '' : Number(row.debit),
          row.debitCategory || '',
          row.credit === '' ? '' : Number(row.credit),
          row.creditCategory || '',
          row.account || '',
          '',
          desc,
          receipt,
        ]);
      }
    }

    // Insert new rows at DATA_START_ROW, pushing existing data down.
    // Reverse so that within a batch the newest transaction ends up at the top.
    sheet.insertRowsBefore(DATA_START_ROW, values.length);
    const topFirst = [...values].reverse();
    sheet.getRange(DATA_START_ROW, DATA_START_COL, topFirst.length, NUM_COLS).setValues(topFirst);

    return json({ ok: true, added: rows.length });

  } catch (err) {
    return json({ error: err.toString() });
  }
}

/**
 * Format an ISO-style timestamp string ("2025-11-01 14:32:00") into
 * MM/dd/yyyy HH:mm:ss in the configured timezone.
 * SQLite stores datetime('now') in UTC.
 */
function formatTimestamp(ts) {
  if (!ts) return '';
  const normalized = ts.replace(' ', 'T') + (ts.includes('T') ? '' : 'Z');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return ts;
  return Utilities.formatDate(d, TIMEZONE, 'MM/dd/yyyy HH:mm:ss');
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Run this manually in the Apps Script editor to verify your sheet is reachable
function testSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  Logger.log('Sheet: ' + sheet.getName() + ' | Last row: ' + sheet.getLastRow());
}
