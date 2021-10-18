/*
 * Unique Passwords [https://github.com/wolandmaster/unique-passwords-firefox]
 * Copyright (c) 2020-2021 Sandor Balazsi
 * This software may be distributed under the terms of the Apache 2.0 license
 */

"use strict";

(() => {
  if (window.hasRunUniquePasswordsContentScriptOnce === true) return;
  window.hasRunUniquePasswordsContentScriptOnce = true;
  browser.runtime.onConnect.addListener(port => {
    if (port.name !== "uniquePasswordsPopup") return;
    port.onMessage.addListener(msg => {
      let passwordInput = browser.menus.getTargetElement(msg.passwordInputId);
      let usernameInput = nearestElement({
        queue: [ [ passwordInput, { ignoreChild: true } ] ],
        selector: usernameSelectorStrict
      }) || nearestElement({
        queue: [ [ passwordInput, { ignoreChild: true } ] ],
        selector: usernameSelectorLoose
      });
      if (msg.action === "getUsername" && usernameInput) {
        usernameInput.dispatchEvent(new Event("focus", { bubbles: true }));
        let username = usernameInput ? usernameInput.value : "";
        port.postMessage({ action: "setUsername", username });
      } else if (msg.action === "setUsername" && usernameInput) {
        usernameInput.value = msg.username;
        usernameInput.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (msg.action === "setPassword" && passwordInput) {
        passwordInput.value = msg.password;
        passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (msg.action === "showPassword" && passwordInput) {
        passwordInput.type = msg.visible ? "text" : "password";
      }
    });
  });
})();

function usernameSelectorLoose(element) {
  return element.tagName === "INPUT" && (element.type === "text" || element.type === "email");
}

function usernameSelectorStrict(element) {
  return usernameSelectorLoose(element) && (element.type === "email"
    || [ "email", "user", "login", "card" ].some(label =>
      [ "id", "class", "name" ].some(attr => {
        let value = element.getAttribute(attr) || "";
        return value.toLowerCase().includes(label);
      })));
}

function nearestElement(params) {
  const { queue, selector } = params;
  while (queue.length !== 0) {
    const record = queue.shift();
    const element = record[0], options = record[1] || {};
    const computedStyle = window.getComputedStyle(element);
    if (selector(element)) {
      return element;
    }
    if (!options.ignoreChild && computedStyle.display !== "none" && computedStyle.visibility !== "hidden") {
      for (let child = element.firstElementChild; child !== null; child = child.nextElementSibling) {
        queue.push([ child, { ignoreParent: true, ignorePrev: true, ignoreNext: true } ]);
      }
    }
    if (!options.ignorePrev && element.previousElementSibling) {
      queue.push([ element.previousElementSibling, { ignoreParent: true, ignoreNext: true } ]);
    }
    if (!options.ignoreNext && element.nextElementSibling) {
      queue.push([ element.nextElementSibling, { ignoreParent: true, ignorePrev: true } ]);
    }
    if (!options.ignoreParent && element.parentElement) {
      queue.push([ element.parentElement, { ignoreChild: true } ]);
    }
  }
}
