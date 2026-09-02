const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR LOG:', msg.text());
    } else {
      console.log('PAGE LOG:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('UNCAUGHT EXCEPTION:', error.message);
  });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    const content = await page.content();
    console.log('Page content length:', content.length);
    if (content.includes('RowPro')) {
      console.log('SUCCESS: RowPro text found on page.');
    } else {
      console.log('FAIL: RowPro text NOT found on page.');
    }
  } catch (err) {
    console.error('Error navigating:', err);
  }

  await browser.close();
})();
