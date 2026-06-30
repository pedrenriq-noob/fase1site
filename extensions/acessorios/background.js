chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.storage.local.set({ pending: [], statusData: {}, itemsData: [] });
  }
});

chrome.runtime.onUpdateAvailable.addListener(() => {
  chrome.runtime.reload();
});
