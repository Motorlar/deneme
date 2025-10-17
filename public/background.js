chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ELEMENT_SELECTED') {
    chrome.runtime.sendMessage(message);
  } else if (message.type === 'SELECTION_CANCELLED') {
    chrome.runtime.sendMessage(message);
  } else if (message.type === 'SAVE_BULK_DATA') {
    handleBulkDataSave(message.data, sendResponse);
    return true;
  }

  return true;
});

async function handleBulkDataSave(data, sendResponse) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/customers?select=id&phone=eq.${data.customerData.phone}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    const existingCustomers = await response.json();

    if (existingCustomers && existingCustomers.length > 0) {
      sendResponse({ success: false, duplicate: true });
      return;
    }

    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        site_config_id: data.configId,
        full_name: data.customerData.full_name || '',
        email: data.customerData.email || '',
        phone: data.customerData.phone || '',
        address: data.customerData.address || '',
        notes: data.customerData.notes || '',
        source_url: data.sourceUrl
      })
    });

    if (insertResponse.ok) {
      sendResponse({ success: true });
    } else {
      const error = await insertResponse.text();
      sendResponse({ success: false, error });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

const SUPABASE_URL = 'https://udxcgmsqozmsdzbbhbqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeGNnbXNxb3ptc2R6YmJoYnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzY2NDcsImV4cCI6MjA3NjIxMjY0N30.2TKqhJxAatR8Qvz68owEoptOAVXtgksfs01LT2dpsNs';

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});
