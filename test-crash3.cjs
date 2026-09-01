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
  await new Promise(r => setTimeout(r, 1000));
  
  // Go to Logger
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const t = tabs.find(t => t.innerText.includes('Logger'));
    if (t) t.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Switch to Strength Tab
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const t = tabs.find(t => t.innerText.includes('筋トレ'));
    if (t) t.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Add a set
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const t = btns.find(t => t.innerText.includes('セット追加'));
    if (t) t.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Input weight and reps
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
    if (inputs[0]) inputs[0].value = '100';
    if (inputs[1]) inputs[1].value = '10';
    if (inputs[0]) inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    if (inputs[1]) inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 500));

  // Click Save
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const t = btns.find(t => t.innerText.includes('記録を保存'));
    if (t) t.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Go to History
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const t = tabs.find(t => t.innerText.includes('履歴'));
    if (t) t.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  await browser.close();
  console.log('Done');
})();
