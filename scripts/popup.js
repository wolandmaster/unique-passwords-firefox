/*
 * Unique Passwords
 * Copyright (c) 2020, Sandor Balazsi <sandor.balazsi@gmail.com>
 * This software may be distributed under the terms of the Apache 2.0 license.
 */

"use strict";

const SITE_CONFIG_URL = "";
// Site config file format:
// [
//   {
//     "domain": "...",
//     "username": "...",
//     "passwordLength": 20,
//     "useLowercase": true,
//     "useUppercase": true,
//     "useNumber": true,
//     "useSpecial": true
//   },
//   ...
// ]
const CHAR_TABLE_LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const CHAR_TABLE_UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CHAR_TABLE_NUMBER = "0123456789";
const CHAR_TABLE_SPECIAL = "!\"#$%&'()*+,-./:;<=>?@[]^_`{|}~";
const HASH_ALGORITHM = "SHA-1";

(async () => {
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
  const showPassword = document.getElementById("show-password");
  const popupParameters = await browser.runtime.sendMessage("getPopupParameters");

  let { tabId, frameId, passwordInputId, pageUrl } = popupParameters;
  await assertIsCurrentTab(tabId);
  await browser.tabs.executeScript(tabId, { runAt: "document_start", frameId, file: "scripts/content.js" });
  let port = browser.tabs.connect(tabId, { name: "uniquePasswordsPopup", frameId });
  port.onMessage.addListener(msg => {
    if (msg.action === "setUsername") {
      username.value = msg.username;
    }
  });
  domain.value = getDomain(pageUrl);
  port.postMessage({ action: "getUsername", passwordInputId });
  if (SITE_CONFIG_URL) {
    await fetch(SITE_CONFIG_URL, { mode: "no-cors", cache: "no-cache" })
      .then(response => response.json())
      .then(json => setSiteSpecificConfig({
        config: json, port, passwordInputId, domain, username, usernameList, passwordLength,
        passwordLengthValue, useLowercase, useUppercase, useNumber, useSpecial
      }))
      .catch((e) => console.error(e));
  }
  addShowPasswordEvent(showMaster,
    () => {
      master.type = "text";
      showMaster.style.fill = "var(--highlight-color)";
    },
    () => {
      master.type = "password";
      master.focus();
      showMaster.style.fill = "var(--foreground-color)";
    });
  passwordLength.addEventListener("input", async () => passwordLengthValue.textContent = passwordLength.value);
  generate.addEventListener("click", async () => {
    const charTable = (useLowercase.checked ? CHAR_TABLE_LOWERCASE : "") + (useNumber.checked ? CHAR_TABLE_NUMBER : "")
      + (useUppercase.checked ? CHAR_TABLE_UPPERCASE : "") + (useSpecial.checked ? CHAR_TABLE_SPECIAL : "");
    const password = (await generatePassword(charTable, domain.value, username.value, master.value)).substring(0, passwordLength.value);
    port.postMessage({ action: "setPassword", passwordInputId, password });
  });
  addShowPasswordEvent(showPassword,
    () => port.postMessage({ action: "showPassword", passwordInputId, visible: true }),
    () => port.postMessage({ action: "showPassword", passwordInputId, visible: false }));
})();

async function assertIsCurrentTab(tabId) {
  let [ currentTab ] = await browser.tabs.query({ active: true, currentWindow: true });
  if (currentTab.id !== tabId) {
    throw new Error("The given tab ID is not the currently active tab");
  }
}

function getDomain(url, subdomain) {
  subdomain = subdomain || false;
  url = url.replace(/(https?:\/\/)?(www.)?/i, '');
  if (url.indexOf('/') !== -1) {
    url = url.split('/')[0];
  }
  if (!subdomain) {
    url = url.split('.');
    url = url.slice(url.length - 2).join('.');
  }
  return url;
}

async function generatePassword(charTable, domain, username, master) {
  const inputData = new TextEncoder().encode(domain + username + master);
  const hashBuffer = await crypto.subtle.digest(HASH_ALGORITHM, inputData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(hashByte => charTable.charAt(hashByte % charTable.length)).join("");
}

function addShowPasswordEvent(trigger, showCallback, hideCallback) {
  let mouseDown;
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

function setSiteSpecificConfig(params) {
  params.domain.addEventListener("input", () => {
    let matchedDomains = params.config.filter(({ domain }) => domain === params.domain.value);
    params.usernameList.innerHTML = matchedDomains.map(domain => '<option value="' + domain.username + '" />').join('');
    if (matchedDomains.length === 1 && !params.username.value) {
      params.port.postMessage({
        action: "setUsername", passwordInputId: params.passwordInputId, username: matchedDomains[0].username
      });
      params.username.value = matchedDomains[0].username;
    }
    params.username.dispatchEvent(new Event("input", { bubbles: true }));
  });
  params.username.addEventListener("input", () => {
    let matchedDomains = params.config.filter(({ domain, username }) =>
      domain === params.domain.value && username === params.username.value);
    if (matchedDomains.length === 1) {
      params.passwordLength.value = matchedDomains[0].passwordLength || 20;
      params.passwordLengthValue.textContent = matchedDomains[0].passwordLength || 20;
      params.useLowercase.checked = matchedDomains[0].useLowercase === undefined ? true : matchedDomains[0].useLowercase;
      params.useUppercase.checked = matchedDomains[0].useUppercase === undefined ? true : matchedDomains[0].useUppercase;
      params.useNumber.checked = matchedDomains[0].useNumber === undefined ? true : matchedDomains[0].useNumber;
      params.useSpecial.checked = matchedDomains[0].useSpecial === undefined ? true : matchedDomains[0].useSpecial;
    }
  });
  params.domain.dispatchEvent(new Event("input", { bubbles: true }));
}
