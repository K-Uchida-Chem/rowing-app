const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  
  // Try to click History tab
  try {
    console.log('Clicking history tab...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const histTab = tabs.find(t => t.innerText.includes('履歴'));
      if (histTab) histTab.click();
    });
    await new Promise(r => setTimeout(r, 2000));
  } catch(e) { console.log(e); }

  await browser.close();
  console.log('Done');
})();
