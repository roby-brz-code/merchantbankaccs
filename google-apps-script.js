/**
 * Google Apps Script — Merchant Bank Details Receiver
 *
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets → Extensions → Apps Script
 * 2. Paste this entire file into the script editor
 * 3. Click Deploy → New deployment
 * 4. Select "Web app" as the type
 * 5. Set "Execute as" to your account
 * 6. Set "Who has access" to "Anyone"
 * 7. Click Deploy and authorize when prompted
 * 8. Copy the Web App URL
 * 9. Set VITE_DATA_ENDPOINT in your Vercel project (or .env.local) to that URL
 *
 * The script will auto-create headers on the first submission.
 * Each POST adds a new row to the active sheet.
 */

const HEADERS = [
  'Submitted At',
  'Merchant Name',
  'Entity Name',
  'Contact Name',
  'Contact Email',
  'Payment Method',
  'Beneficiary Name',
  'Bank Name',
  'Bank Country',
  'Bank Address',
  'Currency',
  'Routing Number',
  'Account Number',
  'Account Type',
  'SWIFT Code',
  'IBAN',
  'Intermediary Bank',
  'Intermediary SWIFT',
  'Beneficiary Address',
  'Payment Reference',
  'Notes',
  'Proof Document Filename',
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Auto-create headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    }

    const row = [
      data.submittedAt || new Date().toISOString(),
      data.merchant?.merchantName || '',
      data.merchant?.entityName || '',
      data.merchant?.contact?.name || '',
      data.merchant?.contact?.email || '',
      data.paymentMethod || '',
      data.bankDetails?.beneficiaryName || '',
      data.bankDetails?.bankName || '',
      data.bankDetails?.bankCountry || '',
      data.bankDetails?.bankAddress || '',
      data.bankDetails?.currency || '',
      data.bankDetails?.routingNumber || '',
      data.bankDetails?.accountNumber || '',
      data.bankDetails?.accountType || '',
      data.bankDetails?.swiftCode || '',
      data.bankDetails?.iban || '',
      data.bankDetails?.intermediaryBank || '',
      data.bankDetails?.intermediarySwift || '',
      data.beneficiaryAddress || '',
      data.reference || '',
      data.notes || '',
      data.proofDocument?.fileName || '',
    ];

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', row: sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'merchant-bank-details', timestamp: new Date().toISOString() }))
    .setMimeType(ContentService.MimeType.JSON);
}
