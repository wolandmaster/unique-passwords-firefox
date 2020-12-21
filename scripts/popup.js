/*
 * Unique Passwords [https://github.com/wolandmaster/unique-passwords-firefox]
 * Copyright (c) 2020 Sandor Balazsi
 * This software may be distributed under the terms of the Apache 2.0 license
 */

"use strict";

(async () => {
  const settings = document.getElementById("settings");
  const domain = document.getElementById("domain");
  const username = document.getElementById("username");
  const usernameList = document.getElementById("username-list");
  const master = document.getElementById("master");
  const showMaster = document.getElementById("show-master");
  const passwordLength = document.getElementById("password-length");
  const passwordLengthValue = document.getElementById("password-length-value");
  const useLowercase = document.getElementById("use-lowercase");
  const useUppercase = document.getElementById("use-uppercase");
  const useNumber = document.getElementById("use-number")
  const useSpecial = document.getElementById("use-special");
  const generate = document.getElementById("generate");
  const progress = document.getElementById("progress");
  const showPassword = document.getElementById("show-password");

  // Initialize content script
  const popupParameters = await browser.runtime.sendMessage("getPopupParameters");
  let { tabId, frameId, passwordInputId, pageUrl } = popupParameters;
  await assertIsCurrentTab(tabId);
  await browser.tabs.executeScript(tabId, { runAt: "document_start", frameId, file: "scripts/content.js" });
  let port = browser.tabs.connect(tabId, { name: "uniquePasswordsPopup", frameId });

  // Settings
  settings.addEventListener("click", () => browser.runtime.openOptionsPage());

  // Domain
  domain.value = getDomain(pageUrl);
  domain.addEventListener("input", setGenerateEnable);

  // Username
  port.onMessage.addListener(msg => (msg.action === "setUsername") && (msg.username) && (username.value = msg.username));
  port.postMessage({ action: "getUsername", passwordInputId });

  // Master Password
  master.addEventListener("input", setGenerateEnable);
  addShowPasswordEvent(showMaster,
    () => [ master.type, showMaster.style.fill ] = [ "text", "var(--highlight-color)" ],
    () => [ master.type, showMaster.style.fill ] = [ "password", "var(--foreground-color)" ]);

  // Password Length
  passwordLength.addEventListener("input", () => passwordLengthValue.textContent = passwordLength.value);

  // Generate Password
  generate.addEventListener("click", async () => {
    [ progress.style.visibility, progress.style.opacity, generate.disabled ] = [ "visible", 1, true ];
    const password = await generatePassword({
      domain, username, master, passwordLength, useLowercase, useUppercase, useNumber, useSpecial
    });
    [ progress.style.visibility, progress.style.opacity, generate.disabled ] = [ "hidden", 0, false ];
    port.postMessage({ action: "setPassword", passwordInputId, password });
    await saveAccount({ domain, username, passwordLength, useLowercase, useUppercase, useNumber, useSpecial });
  });
  function setGenerateEnable() {
    generate.disabled = domain.value.length === 0 || master.value.length === 0
      || (!useLowercase.checked && !useUppercase.checked && !useNumber.checked && !useSpecial.checked);
  }

  // Show Password
  addShowPasswordEvent(showPassword,
    () => port.postMessage({ action: "showPassword", passwordInputId, visible: true }),
    () => port.postMessage({ action: "showPassword", passwordInputId, visible: false }));

  // Used character groups
  useLowercase.addEventListener("input", setGenerateEnable);
  useUppercase.addEventListener("input", setGenerateEnable);
  useNumber.addEventListener("input", setGenerateEnable);
  useSpecial.addEventListener("input", setGenerateEnable);

  // Load Cached Accounts
  await loadAccount({
    port, passwordInputId, domain, username, usernameList, passwordLength,
    useLowercase, useUppercase, useNumber, useSpecial
  });
})();

async function generatePassword(params) {
  const textEncoder = new TextEncoder();
  const settings = await browser.storage.local.get();
  const charTable = ""
    + (params.useLowercase.checked ? settings.lowercaseChars : "")
    + (params.useNumber.checked ? settings.numberChars : "")
    + (params.useUppercase.checked ? settings.uppercaseChars : "")
    + (params.useSpecial.checked ? settings.specialChars : "");
  let hash;
  if (settings.globalHashAlgorithm.startsWith("sha-")) {
    const data = textEncoder.encode(params.domain.value + params.username.value + params.master.value);
    hash = Array.from(new Uint8Array(await crypto.subtle.digest(settings.globalHashAlgorithm, data)));
  } else if (settings.globalHashAlgorithm === "scrypt") {
    const data = textEncoder.encode(params.master.value);
    const salt = textEncoder.encode(params.domain.value + params.username.value);
    hash = Array.from(await scrypt(data, salt, parseInt(settings.globalCostFactor), 8, 1, 20));
  }
  return hash.map(hashByte => charTable.charAt(hashByte % charTable.length))
    .join("")
    .substring(0, params.passwordLength.value);
}

async function saveAccount(params) {
  const settings = await browser.storage.local.get();
  if (!settings.globalCacheAccounts) return;
  const cachedAccounts = settings.cachedAccounts;
  const accountToSave = {
    domain: params.domain.value, username: params.username.value, passwordLength: params.passwordLength.valueAsNumber,
    useLowercase: params.useLowercase.checked, useUppercase: params.useUppercase.checked,
    useNumber: params.useNumber.checked, useSpecial: params.useSpecial.checked
  }
  let accountUpdated = false;
  cachedAccounts.forEach((account, index) => {
    if (params.domain.value === account.domain && params.username.value === account.username) {
      cachedAccounts[index] = accountToSave;
      accountUpdated = true;
    }
  });
  if (!accountUpdated) {
    cachedAccounts.push(accountToSave);
  }
  await browser.storage.local.set({ cachedAccounts });
}

async function loadAccount(params) {
  const settings = await browser.storage.local.get();

  // Domain
  params.domain.addEventListener("input", () => {
    let matchedAccounts = settings.cachedAccounts.filter(({ domain }) => domain === params.domain.value);
    matchedAccounts.forEach(account => {
      params.usernameList.appendChild(document.createElement("option")).value = account.username;
    });
    if (matchedAccounts.length === 1 && !params.username.value) {
      params.username.value = matchedAccounts[0].username;
      params.port.postMessage({
        action: "setUsername", passwordInputId: params.passwordInputId, username: matchedAccounts[0].username
      });
    }
    params.username.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // Username
  params.username.addEventListener("input", () => {
    let matchedAccounts = settings.cachedAccounts.filter(({ domain, username }) =>
      domain === params.domain.value && username === params.username.value);
    if (matchedAccounts.length === 1) {
      params.passwordLength.valueAsNumber = matchedAccounts[0].passwordLength;
      params.passwordLength.dispatchEvent(new Event("input", { bubbles: true }));
      params.useLowercase.checked = matchedAccounts[0].useLowercase;
      params.useUppercase.checked = matchedAccounts[0].useUppercase;
      params.useNumber.checked = matchedAccounts[0].useNumber;
      params.useSpecial.checked = matchedAccounts[0].useSpecial;
    } else {
      params.passwordLength.valueAsNumber = settings.globalPasswordLength;
      params.passwordLength.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  params.domain.dispatchEvent(new Event("input", { bubbles: true }));
}

function getDomain(url, subdomain) {
  subdomain = subdomain || false;
  url = url.replace(/(https?:\/\/)?(www.)?/i, "");
  if (url.indexOf("/") !== -1) {
    url = url.split("/")[0];
  }
  if (!subdomain) {
    url = url.split(".");
    url = url.slice(url.length - 2).join(".");
  }
  return url;
}

function addShowPasswordEvent(trigger, showCallback, hideCallback) {
  let mouseDown = false;
  trigger.addEventListener("mousedown", () => {
    mouseDown = true;
    showCallback();
  });
  trigger.addEventListener("mouseup", () => {
    mouseDown = false;
    hideCallback();
  });
  trigger.addEventListener("mouseout", () => {
    if (mouseDown) {
      hideCallback();
    }
  });
}

async function assertIsCurrentTab(tabId) {
  let [ currentTab ] = await browser.tabs.query({ active: true, currentWindow: true });
  if (currentTab.id !== tabId) {
    throw new Error("The given tab ID is not the currently active tab");
  }
}
