let isSelecting = false;
let currentField = null;
let overlay = null;
let label = null;

function createOverlay() {
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.className = 'element-selector-overlay';
  document.body.appendChild(overlay);

  label = document.createElement('div');
  label.className = 'element-selector-label';
  document.body.appendChild(label);
}

function removeOverlay() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  if (label) {
    label.remove();
    label = null;
  }
}

function getElementSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }

  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(c => c);
    if (classes.length > 0) {
      const selector = element.tagName.toLowerCase() + '.' + classes.join('.');
      const matches = document.querySelectorAll(selector);
      if (matches.length === 1) {
        return selector;
      }
    }
  }

  let path = [];
  let current = element;

  while (current && current.tagName) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      path.unshift(`#${current.id}`);
      break;
    }

    let sibling = current;
    let nth = 1;
    while (sibling.previousElementSibling) {
      sibling = sibling.previousElementSibling;
      if (sibling.tagName === current.tagName) {
        nth++;
      }
    }

    if (nth > 1) {
      selector += `:nth-of-type(${nth})`;
    }

    path.unshift(selector);
    current = current.parentElement;

    if (path.length > 5) break;
  }

  return path.join(' > ');
}

function highlightElement(element) {
  if (!overlay || !label) return;

  const rect = element.getBoundingClientRect();
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.display = 'block';

  label.textContent = currentField || 'Element seçin';
  label.style.top = `${rect.top + window.scrollY - 30}px`;
  label.style.left = `${rect.left + window.scrollX}px`;
  label.style.display = 'block';
}

function handleMouseMove(event) {
  if (!isSelecting) return;

  event.preventDefault();
  event.stopPropagation();

  const element = event.target;
  highlightElement(element);
}

function handleClick(event) {
  if (!isSelecting) return;

  event.preventDefault();
  event.stopPropagation();

  const element = event.target;
  const selector = getElementSelector(element);

  // extractTextFromElement fonksiyonunu kullanarak veriyi al
  const textContent = extractTextFromElement(element);

  stopSelecting();

  chrome.runtime.sendMessage({
    type: 'ELEMENT_SELECTED',
    data: {
      field: currentField,
      selector: selector,
      sampleValue: textContent.substring(0, 100)
    }
  });
}





function startSelecting(field) {
  isSelecting = true;
  currentField = field;

  createOverlay();
  document.body.classList.add('element-selector-active');

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
}


function stopSelecting() {
  isSelecting = false;
  currentField = null;

  removeOverlay();
  document.body.classList.remove('element-selector-active');

  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);
}

function extractTextFromElement(element) {
  if (!element) return '';

  // Yöntem 1: Normal textContent
  let text = element.textContent.trim();
  if (text) return text;

  // Yöntem 2: data-content attribute'u kontrol et
  const dataContent = element.getAttribute('data-content');
  if (dataContent) return dataContent.trim();

  // Yöntem 3: ::before pseudo-element'inden content al
  const beforeStyle = window.getComputedStyle(element, '::before');
  const beforeContent = beforeStyle.getPropertyValue('content');
  if (beforeContent && beforeContent !== 'none' && beforeContent !== 'normal') {
    // content değeri genellikle tırnak içinde gelir veya attr() fonksiyonu içerir
    let cleanContent = beforeContent.replace(/^["']|["']$/g, '');

    // Eğer content attr() içeriyorsa, o attribute'u al
    const attrMatch = beforeContent.match(/attr\(([^)]+)\)/);
    if (attrMatch) {
      const attrName = attrMatch[1];
      const attrValue = element.getAttribute(attrName);
      if (attrValue) return attrValue.trim();
    }

    if (cleanContent && cleanContent !== 'none') return cleanContent;
  }

  // Yöntem 4: ::after pseudo-element'inden content al
  const afterStyle = window.getComputedStyle(element, '::after');
  const afterContent = afterStyle.getPropertyValue('content');
  if (afterContent && afterContent !== 'none' && afterContent !== 'normal') {
    let cleanContent = afterContent.replace(/^["']|["']$/g, '');

    const attrMatch = afterContent.match(/attr\(([^)]+)\)/);
    if (attrMatch) {
      const attrName = attrMatch[1];
      const attrValue = element.getAttribute(attrName);
      if (attrValue) return attrValue.trim();
    }

    if (cleanContent && cleanContent !== 'none') return cleanContent;
  }

  // Yöntem 5: Child element içinde CSS ile gizlenmiş veri varsa bul
  const childWithDataContent = element.querySelector('[data-content]');
  if (childWithDataContent) {
    const content = childWithDataContent.getAttribute('data-content');
    if (content) return content.trim();
  }

  // Yöntem 6: Child element içinde ::before olan elemanı bul
  const children = element.querySelectorAll('*');
  for (let child of children) {
    const childBefore = window.getComputedStyle(child, '::before');
    const childBeforeContent = childBefore.getPropertyValue('content');
    if (childBeforeContent && childBeforeContent !== 'none' && childBeforeContent !== 'normal') {
      let cleanContent = childBeforeContent.replace(/^["']|["']$/g, '');

      const attrMatch = childBeforeContent.match(/attr\(([^)]+)\)/);
      if (attrMatch) {
        const attrName = attrMatch[1];
        const attrValue = child.getAttribute(attrName);
        if (attrValue) return attrValue.trim();
      }

      if (cleanContent && cleanContent !== 'none') return cleanContent;
    }
  }

  return '';
}

function extractDataFromPage(fieldMappings) {
  const data = {};

  for (const [field, selector] of Object.entries(fieldMappings)) {
    try {
      const element = document.querySelector(selector);
      data[field] = extractTextFromElement(element);
    } catch (error) {
      console.error(`Error extracting ${field}:`, error);
      data[field] = '';
    }
  }

  return data;
}

function highlightExtractedElements(fieldMappings) {
  document.querySelectorAll('.extraction-highlight').forEach(el => {
    el.classList.remove('extraction-highlight');
  });

  for (const selector of Object.values(fieldMappings)) {
    try {
      const element = document.querySelector(selector);
      if (element) {
        element.classList.add('extraction-highlight');
      }
    } catch (error) {
      console.error('Error highlighting element:', error);
    }
  }

  setTimeout(() => {
    document.querySelectorAll('.extraction-highlight').forEach(el => {
      el.classList.remove('extraction-highlight');
    });
  }, 2000);
}

let bulkExtractionState = {
  isRunning: false,
  links: [],
  currentIndex: 0,
  config: null,
  extractedCount: 0,
  totalCount: 0
};

async function startBulkExtraction(config) {
  try {
    const elements = document.querySelectorAll(config.customerListSelector);
    const links = Array.from(elements)
      .map(el => {
        const anchor = el.tagName === 'A' ? el : el.querySelector('a');
        return anchor ? anchor.href : null;
      })
      .filter(href => href && href.startsWith('http'));

    if (links.length === 0) {
      return { success: false, error: 'Müşteri linkleri bulunamadı!' };
    }

    bulkExtractionState = {
      isRunning: true,
      links: links,
      currentIndex: 0,
      config: config,
      extractedCount: 0,
      totalCount: links.length
    };

    processNextLink();

    return { success: true, totalLinks: links.length };
  } catch (error) {
    console.error('Bulk extraction error:', error);
    return { success: false, error: error.message };
  }
}

function processNextLink() {
  if (!bulkExtractionState.isRunning || bulkExtractionState.currentIndex >= bulkExtractionState.links.length) {
    bulkExtractionState.isRunning = false;
    console.log(`Toplu veri çekme tamamlandı! ${bulkExtractionState.extractedCount}/${bulkExtractionState.totalCount} müşteri çekildi.`);
    return;
  }

  const currentLink = bulkExtractionState.links[bulkExtractionState.currentIndex];
  console.log(`[${bulkExtractionState.currentIndex + 1}/${bulkExtractionState.totalCount}] Ziyaret ediliyor: ${currentLink}`);

  window.location.href = currentLink;
}

function extractAndSaveCurrentPage() {
  if (!bulkExtractionState.isRunning) return;

  const data = extractDataFromPage(bulkExtractionState.config.fieldMappings);
  const phone = data.phone || '';

  if (!phone) {
    console.log('Telefon numarası bulunamadı, atlanıyor...');
    bulkExtractionState.currentIndex++;
    setTimeout(() => processNextLink(), 1500);
    return;
  }

  chrome.runtime.sendMessage({
    type: 'SAVE_BULK_DATA',
    data: {
      configId: bulkExtractionState.config.configId,
      customerData: data,
      sourceUrl: window.location.href
    }
  }, (response) => {
    if (response?.success) {
      bulkExtractionState.extractedCount++;
      console.log(`✓ Müşteri kaydedildi: ${data.full_name || 'İsimsiz'} (${phone})`);
    } else if (response?.duplicate) {
      console.log(`⊘ Müşteri zaten kayıtlı: ${phone}`);
    } else {
      console.log(`✗ Kaydetme hatası: ${response?.error || 'Bilinmeyen hata'}`);
    }

    bulkExtractionState.currentIndex++;
    setTimeout(() => processNextLink(), 1500);
  });
}

window.addEventListener('load', () => {
  if (bulkExtractionState.isRunning && bulkExtractionState.currentIndex > 0) {
    setTimeout(() => extractAndSaveCurrentPage(), 1000);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_SELECTING') {
    startSelecting(message.field);
    sendResponse({ success: true });
  } else if (message.type === 'STOP_SELECTING') {
    stopSelecting();
    sendResponse({ success: true });
  } else if (message.type === 'EXTRACT_DATA') {
    const data = extractDataFromPage(message.fieldMappings);
    highlightExtractedElements(message.fieldMappings);
    sendResponse({ success: true, data });
  } else if (message.type === 'START_BULK_EXTRACTION') {
    const result = startBulkExtraction(message.config);
    sendResponse(result);
  } else if (message.type === 'STOP_BULK_EXTRACTION') {
    bulkExtractionState.isRunning = false;
    sendResponse({ success: true });
  }

  return true;
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isSelecting) {
    stopSelecting();
    chrome.runtime.sendMessage({
      type: 'SELECTION_CANCELLED'
    });
  }
});
