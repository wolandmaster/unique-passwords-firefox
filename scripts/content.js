/*
 * Unique Passwords
 * Copyright (c) 2020, Sandor Balazsi <sandor.balazsi@gmail.com>
 * This software may be distributed under the terms of the Apache 2.0 license.
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
        selector: usernameSelector
      });
      if (msg.action === "getUsername") {
        let username = usernameInput ? usernameInput.value : "";
        port.postMessage({ action: "setUsername", username });
      } else if (msg.action === "setUsername" && usernameInput) {
        usernameInput.value = msg.username;
      } else if (msg.action === "setPassword") {
        passwordInput.value = msg.password;
      } else if (msg.action === "showPassword") {
        passwordInput.type = msg.visible ? "text" : "password";
      }
    });
  });

  function usernameSelector(element) {
    return element.tagName === "INPUT" && element.type !== "password"
      && (element.type === "email"
        || [ "email", "user", "login", "card" ].some(label =>
          [ "id", "class", "name" ].some(attr => {
            let value = element.getAttribute(attr) || "";
            return value.toLowerCase().includes(label);
          })));
  }

  function nearestElement(params) {
    let { queue, selector } = params;
    while (queue.length !== 0) {
      let record = queue.shift();
      let element = record[0], options = record[1] || {};
      let computedStyle = window.getComputedStyle(element);
      if (computedStyle.display === "none" || computedStyle.visibility === "hidden") {
        continue;
      }
      if (selector(element)) {
        return element;
      }
      if (!options.ignoreChild) {
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
})();
