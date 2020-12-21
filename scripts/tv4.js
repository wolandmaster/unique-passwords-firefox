/*
 * Tiny Validator for JSON Schema v4 [https://github.com/geraintluff/tv4]
 * Copyright (c) 2013 Geraint Luff and others
 * This code is released into the "public domain" by its author(s)
 */

"use strict";

(function (global, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS. Define export.
    module.exports = factory();
  } else {
    // Browser globals
    global.tv4 = factory();
  }
}(this, function () {

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys?redirectlocale=en-US&redirectslug=JavaScript%2FReference%2FGlobal_Objects%2FObject%2Fkeys
  if (!Object.keys) {
    Object.keys = (function () {
      let hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

      return function (obj) {
        if (typeof obj !== 'object' && typeof obj !== 'function' || obj === null) {
          throw new TypeError('Object.keys called on non-object');
        }
        let result = [];
        for (let prop in obj) {
          if (hasOwnProperty.call(obj, prop)) {
            result.push(prop);
          }
        }
        if (hasDontEnumBug) {
          for (let i = 0; i < dontEnumsLength; i++) {
            if (hasOwnProperty.call(obj, dontEnums[i])) {
              result.push(dontEnums[i]);
            }
          }
        }
        return result;
      };
    })();
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
  if (!Object.create) {
    Object.create = (function () {
      function F() {
      }

      return function (o) {
        if (arguments.length !== 1) {
          throw new Error('Object.create implementation only accepts one parameter.');
        }
        F.prototype = o;
        return new F();
      };
    })();
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray?redirectlocale=en-US&redirectslug=JavaScript%2FReference%2FGlobal_Objects%2FArray%2FisArray
  if (!Array.isArray) {
    Array.isArray = function (vArg) {
      return Object.prototype.toString.call(vArg) === "[object Array]";
    };
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf?redirectlocale=en-US&redirectslug=JavaScript%2FReference%2FGlobal_Objects%2FArray%2FindexOf
  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement /*, fromIndex */) {
      if (this === null) {
        throw new TypeError();
      }
      let t = Object(this);
      let len = t.length >>> 0;
      if (len === 0) {
        return -1;
      }
      let n = 0;
      if (arguments.length > 1) {
        n = Number(arguments[1]);
        if (n !== n) { // shortcut for verifying if it's NaN
          n = 0;
        } else if (n !== 0 && n !== Infinity && n !== -Infinity) {
          n = (n > 0 || -1) * Math.floor(Math.abs(n));
        }
      }
      if (n >= len) {
        return -1;
      }
      let k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
      for (; k < len; k++) {
        if (k in t && t[k] === searchElement) {
          return k;
        }
      }
      return -1;
    };
  }

  // Grungey Object.isFrozen hack
  if (!Object.isFrozen) {
    Object.isFrozen = function (obj) {
      let key = "tv4_test_frozen_key";
      while (obj.hasOwnProperty(key)) {
        key += Math.random();
      }
      try {
        obj[key] = true;
        delete obj[key];
        return false;
      } catch (e) {
        return true;
      }
    };
  }

  // Based on: https://github.com/geraintluff/uri-templates, but with all the de-substitution stuff removed
  const uriTemplateGlobalModifiers = {
    "+": true,
    "#": true,
    ".": true,
    "/": true,
    ";": true,
    "?": true,
    "&": true
  };
  const uriTemplateSuffices = {
    "*": true
  };

  function notReallyPercentEncode(string) {
    return encodeURI(string).replace(/%25[0-9][0-9]/g, function (doubleEncoded) {
      return "%" + doubleEncoded.substring(3);
    });
  }

  function uriTemplateSubstitution(spec) {
    let modifier = "";
    if (uriTemplateGlobalModifiers[spec.charAt(0)]) {
      modifier = spec.charAt(0);
      spec = spec.substring(1);
    }
    let separator = "";
    let prefix = "";
    let shouldEscape = true;
    let showVariables = false;
    let trimEmptyString = false;
    if (modifier === '+') {
      shouldEscape = false;
    } else if (modifier === ".") {
      prefix = ".";
      separator = ".";
    } else if (modifier === "/") {
      prefix = "/";
      separator = "/";
    } else if (modifier === '#') {
      prefix = "#";
      shouldEscape = false;
    } else if (modifier === ';') {
      prefix = ";";
      separator = ";";
      showVariables = true;
      trimEmptyString = true;
    } else if (modifier === '?') {
      prefix = "?";
      separator = "&";
      showVariables = true;
    } else if (modifier === '&') {
      prefix = "&";
      separator = "&";
      showVariables = true;
    }

    let varNames = [];
    let varList = spec.split(",");
    let varSpecs = [];
    let varSpecMap = {};
    for (let i = 0; i < varList.length; i++) {
      let varName = varList[i];
      let truncate = null;
      if (varName.indexOf(":") !== -1) {
        let parts = varName.split(":");
        varName = parts[0];
        truncate = parseInt(parts[1], 10);
      }
      let suffices = {};
      while (uriTemplateSuffices[varName.charAt(varName.length - 1)]) {
        suffices[varName.charAt(varName.length - 1)] = true;
        varName = varName.substring(0, varName.length - 1);
      }
      let varSpec = {
        truncate: truncate,
        name: varName,
        suffices: suffices
      };
      varSpecs.push(varSpec);
      varSpecMap[varName] = varSpec;
      varNames.push(varName);
    }
    let subFunction = function (valueFunction) {
      let result = "";
      let startIndex = 0;
      for (let i = 0; i < varSpecs.length; i++) {
        let varSpec = varSpecs[i];
        let value = valueFunction(varSpec.name);
        if (value === null || value === undefined || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && Object.keys(value).length === 0)) {
          startIndex++;
          continue;
        }
        if (i === startIndex) {
          result += prefix;
        } else {
          result += (separator || ",");
        }
        if (Array.isArray(value)) {
          if (showVariables) {
            result += varSpec.name + "=";
          }
          for (let j = 0; j < value.length; j++) {
            if (j > 0) {
              result += varSpec.suffices['*'] ? (separator || ",") : ",";
              if (varSpec.suffices['*'] && showVariables) {
                result += varSpec.name + "=";
              }
            }
            result += shouldEscape ? encodeURIComponent(value[j]).replace(/!/g, "%21") : notReallyPercentEncode(value[j]);
          }
        } else if (typeof value === "object") {
          if (showVariables && !varSpec.suffices['*']) {
            result += varSpec.name + "=";
          }
          let first = true;
          for (let key in value) {
            if (!first) {
              result += varSpec.suffices['*'] ? (separator || ",") : ",";
            }
            first = false;
            result += shouldEscape ? encodeURIComponent(key).replace(/!/g, "%21") : notReallyPercentEncode(key);
            result += varSpec.suffices['*'] ? '=' : ",";
            result += shouldEscape ? encodeURIComponent(value[key]).replace(/!/g, "%21") : notReallyPercentEncode(value[key]);
          }
        } else {
          if (showVariables) {
            result += varSpec.name;
            if (!trimEmptyString || value !== "") {
              result += "=";
            }
          }
          if (varSpec.truncate != null) {
            value = value.substring(0, varSpec.truncate);
          }
          result += shouldEscape ? encodeURIComponent(value).replace(/!/g, "%21") : notReallyPercentEncode(value);
        }
      }
      return result;
    };
    subFunction.varNames = varNames;
    return {
      prefix: prefix,
      substitution: subFunction
    };
  }

  function UriTemplate(template) {
    if (!(this instanceof UriTemplate)) {
      return new UriTemplate(template);
    }
    let parts = template.split("{");
    let textParts = [ parts.shift() ];
    let prefixes = [];
    let substitutions = [];
    let varNames = [];
    while (parts.length > 0) {
      let part = parts.shift();
      let spec = part.split("}")[0];
      let remainder = part.substring(spec.length + 1);
      let funcs = uriTemplateSubstitution(spec);
      substitutions.push(funcs.substitution);
      prefixes.push(funcs.prefix);
      textParts.push(remainder);
      varNames = varNames.concat(funcs.substitution.varNames);
    }
    this.fill = function (valueFunction) {
      let result = textParts[0];
      for (let i = 0; i < substitutions.length; i++) {
        let substitution = substitutions[i];
        result += substitution(valueFunction);
        result += textParts[i + 1];
      }
      return result;
    };
    this.varNames = varNames;
    this.template = template;
  }

  UriTemplate.prototype = {
    toString: function () {
      return this.template;
    },
    fillFromObject: function (obj) {
      return this.fill(function (varName) {
        return obj[varName];
      });
    }
  };
  let ValidatorContext = function ValidatorContext(parent, collectMultiple, errorReporter, checkRecursive, trackUnknownProperties) {
    this.missing = [];
    this.missingMap = {};
    this.formatValidators = parent ? Object.create(parent.formatValidators) : {};
    this.schemas = parent ? Object.create(parent.schemas) : {};
    this.collectMultiple = collectMultiple;
    this.errors = [];
    this.handleError = collectMultiple ? this.collectError : this.returnError;
    if (checkRecursive) {
      this.checkRecursive = true;
      this.scanned = [];
      this.scannedFrozen = [];
      this.scannedFrozenSchemas = [];
      this.scannedFrozenValidationErrors = [];
      this.validatedSchemasKey = 'tv4_validation_id';
      this.validationErrorsKey = 'tv4_validation_errors_id';
    }
    if (trackUnknownProperties) {
      this.trackUnknownProperties = true;
      this.knownPropertyPaths = {};
      this.unknownPropertyPaths = {};
    }
    this.errorReporter = errorReporter || defaultErrorReporter('en');
    if (typeof this.errorReporter === 'string') {
      throw new Error('debug');
    }
    this.definedKeywords = {};
    if (parent) {
      for (let key in parent.definedKeywords) {
        this.definedKeywords[key] = parent.definedKeywords[key].slice(0);
      }
    }
  };
  ValidatorContext.prototype.defineKeyword = function (keyword, keywordFunction) {
    this.definedKeywords[keyword] = this.definedKeywords[keyword] || [];
    this.definedKeywords[keyword].push(keywordFunction);
  };
  ValidatorContext.prototype.createError = function (code, messageParams, dataPath, schemaPath, subErrors, data, schema) {
    let error = new ValidationError(code, messageParams, dataPath, schemaPath, subErrors);
    error.message = this.errorReporter(error);
    return error;
  };
  ValidatorContext.prototype.returnError = function (error) {
    return error;
  };
  ValidatorContext.prototype.collectError = function (error) {
    if (error) {
      this.errors.push(error);
    }
    return null;
  };
  ValidatorContext.prototype.prefixErrors = function (startIndex, dataPath, schemaPath) {
    for (let i = startIndex; i < this.errors.length; i++) {
      this.errors[i] = this.errors[i].prefixWith(dataPath, schemaPath);
    }
    return this;
  };
  ValidatorContext.prototype.banUnknownProperties = function (data, schema) {
    for (let unknownPath in this.unknownPropertyPaths) {
      let error = this.createError(ErrorCodes.UNKNOWN_PROPERTY, { path: unknownPath }, unknownPath, "", null, data, schema);
      let result = this.handleError(error);
      if (result) {
        return result;
      }
    }
    return null;
  };
  ValidatorContext.prototype.addFormat = function (format, validator) {
    if (typeof format === 'object') {
      for (let key in format) {
        this.addFormat(key, format[key]);
      }
      return this;
    }
    this.formatValidators[format] = validator;
  };
  ValidatorContext.prototype.resolveRefs = function (schema, urlHistory) {
    if (schema['$ref'] !== undefined) {
      urlHistory = urlHistory || {};
      if (urlHistory[schema['$ref']]) {
        return this.createError(ErrorCodes.CIRCULAR_REFERENCE, { urls: Object.keys(urlHistory).join(', ') }, '', '', null, undefined, schema);
      }
      urlHistory[schema['$ref']] = true;
      schema = this.getSchema(schema['$ref'], urlHistory);
    }
    return schema;
  };
  ValidatorContext.prototype.getSchema = function (url, urlHistory) {
    let schema;
    if (this.schemas[url] !== undefined) {
      schema = this.schemas[url];
      return this.resolveRefs(schema, urlHistory);
    }
    let baseUrl = url;
    let fragment = "";
    if (url.indexOf('#') !== -1) {
      fragment = url.substring(url.indexOf("#") + 1);
      baseUrl = url.substring(0, url.indexOf("#"));
    }
    if (typeof this.schemas[baseUrl] === 'object') {
      schema = this.schemas[baseUrl];
      let pointerPath = decodeURIComponent(fragment);
      if (pointerPath === "") {
        return this.resolveRefs(schema, urlHistory);
      } else if (pointerPath.charAt(0) !== "/") {
        return undefined;
      }
      let parts = pointerPath.split("/").slice(1);
      for (let i = 0; i < parts.length; i++) {
        let component = parts[i].replace(/~1/g, "/").replace(/~0/g, "~");
        if (schema[component] === undefined) {
          schema = undefined;
          break;
        }
        schema = schema[component];
      }
      if (schema !== undefined) {
        return this.resolveRefs(schema, urlHistory);
      }
    }
    if (this.missing[baseUrl] === undefined) {
      this.missing.push(baseUrl);
      this.missing[baseUrl] = baseUrl;
      this.missingMap[baseUrl] = baseUrl;
    }
  };
  ValidatorContext.prototype.searchSchemas = function (schema, url) {
    if (Array.isArray(schema)) {
      for (let i = 0; i < schema.length; i++) {
        this.searchSchemas(schema[i], url);
      }
    } else if (schema && typeof schema === "object") {
      if (typeof schema.id === "string") {
        if (isTrustedUrl(url, schema.id)) {
          if (this.schemas[schema.id] === undefined) {
            this.schemas[schema.id] = schema;
          }
        }
      }
      for (let key in schema) {
        if (key !== "enum") {
          if (typeof schema[key] === "object") {
            this.searchSchemas(schema[key], url);
          } else if (key === "$ref") {
            let uri = getDocumentUri(schema[key]);
            if (uri && this.schemas[uri] === undefined && this.missingMap[uri] === undefined) {
              this.missingMap[uri] = uri;
            }
          }
        }
      }
    }
  };
  ValidatorContext.prototype.addSchema = function (url, schema) {
    //overload
    if (typeof url !== 'string' || typeof schema === 'undefined') {
      if (typeof url === 'object' && typeof url.id === 'string') {
        schema = url;
        url = schema.id;
      } else {
        return;
      }
    }
    if (url === getDocumentUri(url) + "#") {
      // Remove empty fragment
      url = getDocumentUri(url);
    }
    this.schemas[url] = schema;
    delete this.missingMap[url];
    normSchema(schema, url);
    this.searchSchemas(schema, url);
  };
  ValidatorContext.prototype.getSchemaMap = function () {
    let map = {};
    for (let key in this.schemas) {
      map[key] = this.schemas[key];
    }
    return map;
  };
  ValidatorContext.prototype.getSchemaUris = function (filterRegExp) {
    let list = [];
    for (let key in this.schemas) {
      if (!filterRegExp || filterRegExp.test(key)) {
        list.push(key);
      }
    }
    return list;
  };
  ValidatorContext.prototype.getMissingUris = function (filterRegExp) {
    let list = [];
    for (let key in this.missingMap) {
      if (!filterRegExp || filterRegExp.test(key)) {
        list.push(key);
      }
    }
    return list;
  };
  ValidatorContext.prototype.dropSchemas = function () {
    this.schemas = {};
    this.reset();
  };
  ValidatorContext.prototype.reset = function () {
    this.missing = [];
    this.missingMap = {};
    this.errors = [];
  };
  ValidatorContext.prototype.validateAll = function (data, schema, dataPathParts, schemaPathParts, dataPointerPath) {
    let topLevel;
    schema = this.resolveRefs(schema);
    if (!schema) {
      return null;
    } else if (schema instanceof ValidationError) {
      this.errors.push(schema);
      return schema;
    }

    let startErrorCount = this.errors.length;
    let frozenIndex, scannedFrozenSchemaIndex = null, scannedSchemasIndex = null;
    if (this.checkRecursive && data && typeof data === 'object') {
      topLevel = !this.scanned.length;
      if (data[this.validatedSchemasKey]) {
        let schemaIndex = data[this.validatedSchemasKey].indexOf(schema);
        if (schemaIndex !== -1) {
          this.errors = this.errors.concat(data[this.validationErrorsKey][schemaIndex]);
          return null;
        }
      }
      if (Object.isFrozen(data)) {
        frozenIndex = this.scannedFrozen.indexOf(data);
        if (frozenIndex !== -1) {
          let frozenSchemaIndex = this.scannedFrozenSchemas[frozenIndex].indexOf(schema);
          if (frozenSchemaIndex !== -1) {
            this.errors = this.errors.concat(this.scannedFrozenValidationErrors[frozenIndex][frozenSchemaIndex]);
            return null;
          }
        }
      }
      this.scanned.push(data);
      if (Object.isFrozen(data)) {
        if (frozenIndex === -1) {
          frozenIndex = this.scannedFrozen.length;
          this.scannedFrozen.push(data);
          this.scannedFrozenSchemas.push([]);
        }
        scannedFrozenSchemaIndex = this.scannedFrozenSchemas[frozenIndex].length;
        this.scannedFrozenSchemas[frozenIndex][scannedFrozenSchemaIndex] = schema;
        this.scannedFrozenValidationErrors[frozenIndex][scannedFrozenSchemaIndex] = [];
      } else {
        if (!data[this.validatedSchemasKey]) {
          try {
            Object.defineProperty(data, this.validatedSchemasKey, {
              value: [],
              configurable: true
            });
            Object.defineProperty(data, this.validationErrorsKey, {
              value: [],
              configurable: true
            });
          } catch (e) {
            //IE 7/8 workaround
            data[this.validatedSchemasKey] = [];
            data[this.validationErrorsKey] = [];
          }
        }
        scannedSchemasIndex = data[this.validatedSchemasKey].length;
        data[this.validatedSchemasKey][scannedSchemasIndex] = schema;
        data[this.validationErrorsKey][scannedSchemasIndex] = [];
      }
    }

    let errorCount = this.errors.length;
    let error = this.validateBasic(data, schema, dataPointerPath)
      || this.validateNumeric(data, schema, dataPointerPath)
      || this.validateString(data, schema, dataPointerPath)
      || this.validateArray(data, schema, dataPointerPath)
      || this.validateObject(data, schema, dataPointerPath)
      || this.validateCombinations(data, schema, dataPointerPath)
      || this.validateHypermedia(data, schema, dataPointerPath)
      || this.validateFormat(data, schema, dataPointerPath)
      || this.validateDefinedKeywords(data, schema, dataPointerPath)
      || null;

    if (topLevel) {
      while (this.scanned.length) {
        let item = this.scanned.pop();
        delete item[this.validatedSchemasKey];
      }
      this.scannedFrozen = [];
      this.scannedFrozenSchemas = [];
    }

    if (error || errorCount !== this.errors.length) {
      while ((dataPathParts && dataPathParts.length) || (schemaPathParts && schemaPathParts.length)) {
        let dataPart = (dataPathParts && dataPathParts.length) ? "" + dataPathParts.pop() : null;
        let schemaPart = (schemaPathParts && schemaPathParts.length) ? "" + schemaPathParts.pop() : null;
        if (error) {
          error = error.prefixWith(dataPart, schemaPart);
        }
        this.prefixErrors(errorCount, dataPart, schemaPart);
      }
    }

    if (scannedFrozenSchemaIndex !== null) {
      this.scannedFrozenValidationErrors[frozenIndex][scannedFrozenSchemaIndex] = this.errors.slice(startErrorCount);
    } else if (scannedSchemasIndex !== null) {
      data[this.validationErrorsKey][scannedSchemasIndex] = this.errors.slice(startErrorCount);
    }

    return this.handleError(error);
  };
  ValidatorContext.prototype.validateFormat = function (data, schema) {
    if (typeof schema.format !== 'string' || !this.formatValidators[schema.format]) {
      return null;
    }
    let errorMessage = this.formatValidators[schema.format].call(null, data, schema);
    if (typeof errorMessage === 'string' || typeof errorMessage === 'number') {
      return this.createError(ErrorCodes.FORMAT_CUSTOM, { message: errorMessage }, '', '/format', null, data, schema);
    } else if (errorMessage && typeof errorMessage === 'object') {
      return this.createError(ErrorCodes.FORMAT_CUSTOM, { message: errorMessage.message || "?" }, errorMessage.dataPath || '', errorMessage.schemaPath || "/format", null, data, schema);
    }
    return null;
  };
  ValidatorContext.prototype.validateDefinedKeywords = function (data, schema, dataPointerPath) {
    for (let key in this.definedKeywords) {
      if (typeof schema[key] === 'undefined') {
        continue;
      }
      let validationFunctions = this.definedKeywords[key];
      for (let i = 0; i < validationFunctions.length; i++) {
        let func = validationFunctions[i];
        let result = func(data, schema[key], schema, dataPointerPath);
        if (typeof result === 'string' || typeof result === 'number') {
          return this.createError(ErrorCodes.KEYWORD_CUSTOM, {
            key: key,
            message: result
          }, '', '', null, data, schema).prefixWith(null, key);
        } else if (result && typeof result === 'object') {
          let code = result.code;
          if (typeof code === 'string') {
            if (!ErrorCodes[code]) {
              throw new Error('Undefined error code (use defineError): ' + code);
            }
            code = ErrorCodes[code];
          } else if (typeof code !== 'number') {
            code = ErrorCodes.KEYWORD_CUSTOM;
          }
          let messageParams = (typeof result.message === 'object') ? result.message : {
            key: key,
            message: result.message || "?"
          };
          let schemaPath = result.schemaPath || ("/" + key.replace(/~/g, '~0').replace(/\//g, '~1'));
          return this.createError(code, messageParams, result.dataPath || null, schemaPath, null, data, schema);
        }
      }
    }
    return null;
  };

  function recursiveCompare(A, B) {
    if (A === B) {
      return true;
    }
    if (A && B && typeof A === "object" && typeof B === "object") {
      if (Array.isArray(A) !== Array.isArray(B)) {
        return false;
      } else if (Array.isArray(A)) {
        if (A.length !== B.length) {
          return false;
        }
        for (let i = 0; i < A.length; i++) {
          if (!recursiveCompare(A[i], B[i])) {
            return false;
          }
        }
      } else {
        let key;
        for (key in A) {
          if (B[key] === undefined && A[key] !== undefined) {
            return false;
          }
        }
        for (key in B) {
          if (A[key] === undefined && B[key] !== undefined) {
            return false;
          }
        }
        for (key in A) {
          if (!recursiveCompare(A[key], B[key])) {
            return false;
          }
        }
      }
      return true;
    }
    return false;
  }

  ValidatorContext.prototype.validateBasic = function validateBasic(data, schema, dataPointerPath) {
    let error;
    if ((error = this.validateType(data, schema, dataPointerPath)) !== null) {
      return error.prefixWith(null, "type");
    }
    if ((error = this.validateEnum(data, schema, dataPointerPath)) !== null) {
      return error.prefixWith(null, "type");
    }
    return null;
  };
  ValidatorContext.prototype.validateType = function validateType(data, schema) {
    if (schema.type === undefined) {
      return null;
    }
    let dataType = typeof data;
    if (data === null) {
      dataType = "null";
    } else if (Array.isArray(data)) {
      dataType = "array";
    }
    let allowedTypes = schema.type;
    if (!Array.isArray(allowedTypes)) {
      allowedTypes = [ allowedTypes ];
    }

    for (let i = 0; i < allowedTypes.length; i++) {
      let type = allowedTypes[i];
      if (type === dataType || (type === "integer" && dataType === "number" && (data % 1 === 0))) {
        return null;
      }
    }
    return this.createError(ErrorCodes.INVALID_TYPE, {
      type: dataType,
      expected: allowedTypes.join("/")
    }, '', '', null, data, schema);
  };
  ValidatorContext.prototype.validateEnum = function validateEnum(data, schema) {
    if (schema["enum"] === undefined) {
      return null;
    }
    for (let i = 0; i < schema["enum"].length; i++) {
      let enumVal = schema["enum"][i];
      if (recursiveCompare(data, enumVal)) {
        return null;
      }
    }
    return this.createError(ErrorCodes.ENUM_MISMATCH, { value: (typeof JSON !== 'undefined') ? JSON.stringify(data) : data }, '', '', null, data, schema);
  };
  ValidatorContext.prototype.validateNumeric = function validateNumeric(data, schema, dataPointerPath) {
    return this.validateMultipleOf(data, schema, dataPointerPath)
      || this.validateMinMax(data, schema, dataPointerPath)
      || this.validateNaN(data, schema, dataPointerPath)
      || null;
  };

  let CLOSE_ENOUGH_LOW = Math.pow(2, -51);
  let CLOSE_ENOUGH_HIGH = 1 - CLOSE_ENOUGH_LOW;
  ValidatorContext.prototype.validateMultipleOf = function validateMultipleOf(data, schema) {
    let multipleOf = schema.multipleOf || schema.divisibleBy;
    if (multipleOf === undefined) {
      return null;
    }
    if (typeof data === "number") {
      let remainder = (data / multipleOf) % 1;
      if (remainder >= CLOSE_ENOUGH_LOW && remainder < CLOSE_ENOUGH_HIGH) {
        return this.createError(ErrorCodes.NUMBER_MULTIPLE_OF, {
          value: data,
          multipleOf: multipleOf
        }, '', '', null, data, schema);
      }
    }
    return null;
  };
  ValidatorContext.prototype.validateMinMax = function validateMinMax(data, schema) {
    if (typeof data !== "number") {
      return null;
    }
    if (schema.minimum !== undefined) {
      if (data < schema.minimum) {
        return this.createError(ErrorCodes.NUMBER_MINIMUM, {
          value: data,
          minimum: schema.minimum
        }, '', '/minimum', null, data, schema);
      }
      if (schema.exclusiveMinimum && data === schema.minimum) {
        return this.createError(ErrorCodes.NUMBER_MINIMUM_EXCLUSIVE, {
          value: data,
          minimum: schema.minimum
        }, '', '/exclusiveMinimum', null, data, schema);
      }
    }
    if (schema.maximum !== undefined) {
      if (data > schema.maximum) {
        return this.createError(ErrorCodes.NUMBER_MAXIMUM, {
          value: data,
          maximum: schema.maximum
        }, '', '/maximum', null, data, schema);
      }
      if (schema.exclusiveMaximum && data === schema.maximum) {
        return this.createError(ErrorCodes.NUMBER_MAXIMUM_EXCLUSIVE, {
          value: data,
          maximum: schema.maximum
        }, '', '/exclusiveMaximum', null, data, schema);
      }
    }
    return null;
  };
  ValidatorContext.prototype.validateNaN = function validateNaN(data, schema) {
    if (typeof data !== "number") {
      return null;
    }
    if (isNaN(data) === true || data === Infinity || data === -Infinity) {
      return this.createError(ErrorCodes.NUMBER_NOT_A_NUMBER, { value: data }, '', '/type', null, data, schema);
    }
    return null;
  };
  ValidatorContext.prototype.validateString = function validateString(data, schema, dataPointerPath) {
    return this.validateStringLength(data, schema, dataPointerPath)
      || this.validateStringPattern(data, schema, dataPointerPath)
      || null;
  };
  ValidatorContext.prototype.validateStringLength = function validateStringLength(data, schema) {
    if (typeof data !== "string") {
      return null;
    }
    if (schema.minLength !== undefined) {
      if (data.length < schema.minLength) {
        return this.createError(ErrorCodes.STRING_LENGTH_SHORT, {
          length: data.length,
          minimum: schema.minLength
        }, '', '/minLength', null, data, schema);
      }
    }
    if (schema.maxLength !== undefined) {
      if (data.length > schema.maxLength) {
        return this.createError(ErrorCodes.STRING_LENGTH_LONG, {
          length: data.length,
          maximum: schema.maxLength
        }, '', '/maxLength', null, data, schema);
      }
    }
    return null;
  };
  ValidatorContext.prototype.validateStringPattern = function validateStringPattern(data, schema) {
    if (typeof data !== "string" || (typeof schema.pattern !== "string" && !(schema.pattern instanceof RegExp))) {
      return null;
    }
    let regexp;
    if (schema.pattern instanceof RegExp) {
      regexp = schema.pattern;
    } else {
      let body, flags = '';
      // Check for regular expression literals
      // @see http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.5
      let literal = schema.pattern.match(/^\/(.+)\/([img]*)$/);
      if (literal) {
        body = literal[1];
        flags = literal[2];
      } else {
        body = schema.pattern;
      }
      regexp = new RegExp(body, flags);
    }
    if (!regexp.test(data)) {
      return this.createError(ErrorCodes.STRING_PATTERN, { pattern: schema.pattern }, '', '/pattern', null, data, schema);
    }
    return null;
  };
  ValidatorContext.prototype.validateArray = function validateArray(data, schema, dataPointerPath) {
    if (!Array.isArray(data)) {
      return null;
    }
    return this.validateArrayLength(data, schema, dataPointerPath)
      || this.validateArrayUniqueItems(data, schema, dataPointerPath)
      || this.validateArrayItems(data, schema, dataPointerPath)
      || null;
  };
  ValidatorContext.prototype.validateArrayLength = function validateArrayLength(data, schema) {
    let error;
    if (schema.minItems !== undefined) {
      if (data.length < schema.minItems) {
        error = this.createError(ErrorCodes.ARRAY_LENGTH_SHORT, {
          length: data.length,
          minimum: schema.minItems
        }, '', '/minItems', null, data, schema);
        if (this.handleError(error)) {
          return error;
        }
      }
    }
    if (schema.maxItems !== undefined) {
      if (data.length > schema.maxItems) {
        error = this.createError(ErrorCodes.ARRAY_LENGTH_LONG, {
          length: data.length,
          maximum: schema.maxItems
        }, '', '/maxItems', null, data, schema);
        if (this.handleError(error)) {
          return error;
        }
      }
    }
    return null;
  };
  ValidatorContext.prototype.validateArrayUniqueItems = function validateArrayUniqueItems(data, schema) {
    if (schema.uniqueItems) {
      for (let i = 0; i < data.length; i++) {
        for (let j = i + 1; j < data.length; j++) {
          if (recursiveCompare(data[i], data[j])) {
            let error = this.createError(ErrorCodes.ARRAY_UNIQUE, {
              match1: i,
              match2: j
            }, '', '/uniqueItems', null, data, schema);
            if (this.handleError(error)) {
              return error;
            }
          }
        }
      }
    }
    return null;
  };
  ValidatorContext.prototype.validateArrayItems = function validateArrayItems(data, schema, dataPointerPath) {
    if (schema.items === undefined) {
      return null;
    }
    let error, i;
    if (Array.isArray(schema.items)) {
      for (i = 0; i < data.length; i++) {
        if (i < schema.items.length) {
          if ((error = this.validateAll(data[i], schema.items[i], [ i ], [ "items", i ], dataPointerPath + "/" + i)) !== null) {
            return error;
          }
        } else if (schema.additionalItems !== undefined) {
          if (typeof schema.additionalItems === "boolean") {
            if (!schema.additionalItems) {
              error = (this.createError(ErrorCodes.ARRAY_ADDITIONAL_ITEMS, {}, '/' + i, '/additionalItems', null, data, schema));
              if (this.handleError(error)) {
                return error;
              }
            }
          } else if ((error = this.validateAll(data[i], schema.additionalItems, [ i ], [ "additionalItems" ], dataPointerPath + "/" + i)) !== null) {
            return error;
          }
        }
      }
    } else {
      for (i = 0; i < data.length; i++) {
        if ((error = this.validateAll(data[i], schema.items, [ i ], [ "items" ], dataPointerPath + "/" + i)) !== null) {
          return error;
        }
      }
    }
    return null;
  };
  ValidatorContext.prototype.validateObject = function validateObject(data, schema, dataPointerPath) {
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return null;
    }
    return this.validateObjectMinMaxProperties(data, schema, dataPointerPath)
      || this.validateObjectRequiredProperties(data, schema, dataPointerPath)
      || this.validateObjectProperties(data, schema, dataPointerPath)
      || this.validateObjectDependencies(data, schema, dataPointerPath)
      || null;
  };
  ValidatorContext.prototype.validateObjectMinMaxProperties = function validateObjectMinMaxProperties(data, schema) {
    let keys = Object.keys(data);
    let error;
    if (schema.minProperties !== undefined) {
      if (keys.length < schema.minProperties) {
        error = this.createError(ErrorCodes.OBJECT_PROPERTIES_MINIMUM, {
          propertyCount: keys.length,
          minimum: schema.minProperties
        }, '', '/minProperties', null, data, schema);
        if (this.handleError(error)) {
          return error;
        }
      }
    }
    if (schema.maxProperties !== undefined) {
      if (keys.length > schema.maxProperties) {
        error = this.createError(ErrorCodes.OBJECT_PROPERTIES_MAXIMUM, {
          propertyCount: keys.length,
          maximum: schema.maxProperties
        }, '', '/maxProperties', null, data, schema);
        if (this.handleError(error)) {
          return error;
        }
      }
    }
    return null;
  };
  ValidatorContext.prototype.validateObjectRequiredProperties = function validateObjectRequiredProperties(data, schema) {
    if (schema.required !== undefined) {
      for (let i = 0; i < schema.required.length; i++) {
        let key = schema.required[i];
        if (data[key] === undefined) {
          let error = this.createError(ErrorCodes.OBJECT_REQUIRED, { key: key }, '', '/required/' + i, null, data, schema);
          if (this.handleError(error)) {
            return error;
          }
        }
      }
    }
    return null;
  };
  ValidatorContext.prototype.validateObjectProperties = function validateObjectProperties(data, schema, dataPointerPath) {
    let error;
    for (let key in data) {
      let keyPointerPath = dataPointerPath + "/" + key.replace(/~/g, '~0').replace(/\//g, '~1');
      let foundMatch = false;
      if (schema.properties !== undefined && schema.properties[key] !== undefined) {
        foundMatch = true;
        if ((error = this.validateAll(data[key], schema.properties[key], [ key ], [ "properties", key ], keyPointerPath)) !== null) {
          return error;
        }
      }
      if (schema.patternProperties !== undefined) {
        for (let patternKey in schema.patternProperties) {
          let regexp = new RegExp(patternKey);
          if (regexp.test(key)) {
            foundMatch = true;
            if ((error = this.validateAll(data[key], schema.patternProperties[patternKey], [ key ], [ "patternProperties", patternKey ], keyPointerPath)) !== null) {
              return error;
            }
          }
        }
      }
      if (!foundMatch) {
        if (schema.additionalProperties !== undefined) {
          if (this.trackUnknownProperties) {
            this.knownPropertyPaths[keyPointerPath] = true;
            delete this.unknownPropertyPaths[keyPointerPath];
          }
          if (typeof schema.additionalProperties === "boolean") {
            if (!schema.additionalProperties) {
              error = this.createError(ErrorCodes.OBJECT_ADDITIONAL_PROPERTIES, { key: key }, '', '/additionalProperties', null, data, schema).prefixWith(key, null);
              if (this.handleError(error)) {
                return error;
              }
            }
          } else {
            if ((error = this.validateAll(data[key], schema.additionalProperties, [ key ], [ "additionalProperties" ], keyPointerPath)) !== null) {
              return error;
            }
          }
        } else if (this.trackUnknownProperties && !this.knownPropertyPaths[keyPointerPath]) {
          this.unknownPropertyPaths[keyPointerPath] = true;
        }
      } else if (this.trackUnknownProperties) {
        this.knownPropertyPaths[keyPointerPath] = true;
        delete this.unknownPropertyPaths[keyPointerPath];
      }
    }
    return null;
  };
  ValidatorContext.prototype.validateObjectDependencies = function validateObjectDependencies(data, schema, dataPointerPath) {
    let error;
    if (schema.dependencies !== undefined) {
      for (let depKey in schema.dependencies) {
        if (data[depKey] !== undefined) {
          let dep = schema.dependencies[depKey];
          if (typeof dep === "string") {
            if (data[dep] === undefined) {
              error = this.createError(ErrorCodes.OBJECT_DEPENDENCY_KEY, {
                key: depKey,
                missing: dep
              }, '', '', null, data, schema).prefixWith(null, depKey).prefixWith(null, "dependencies");
              if (this.handleError(error)) {
                return error;
              }
            }
          } else if (Array.isArray(dep)) {
            for (let i = 0; i < dep.length; i++) {
              let requiredKey = dep[i];
              if (data[requiredKey] === undefined) {
                error = this.createError(ErrorCodes.OBJECT_DEPENDENCY_KEY, {
                  key: depKey,
                  missing: requiredKey
                }, '', '/' + i, null, data, schema).prefixWith(null, depKey).prefixWith(null, "dependencies");
                if (this.handleError(error)) {
                  return error;
                }
              }
            }
          } else {
            if ((error = this.validateAll(data, dep, [], [ "dependencies", depKey ], dataPointerPath)) !== null) {
              return error;
            }
          }
        }
      }
    }
    return null;
  };
  ValidatorContext.prototype.validateCombinations = function validateCombinations(data, schema, dataPointerPath) {
    return this.validateAllOf(data, schema, dataPointerPath)
      || this.validateAnyOf(data, schema, dataPointerPath)
      || this.validateOneOf(data, schema, dataPointerPath)
      || this.validateNot(data, schema, dataPointerPath)
      || null;
  };
  ValidatorContext.prototype.validateAllOf = function validateAllOf(data, schema, dataPointerPath) {
    if (schema.allOf === undefined) {
      return null;
    }
    let error;
    for (let i = 0; i < schema.allOf.length; i++) {
      let subSchema = schema.allOf[i];
      if ((error = this.validateAll(data, subSchema, [], [ "allOf", i ], dataPointerPath)) !== null) {
        return error;
      }
    }
    return null;
  };
  ValidatorContext.prototype.validateAnyOf = function validateAnyOf(data, schema, dataPointerPath) {
    if (schema.anyOf === undefined) {
      return null;
    }
    let errors = [];
    let startErrorCount = this.errors.length;
    let oldUnknownPropertyPaths, oldKnownPropertyPaths;
    if (this.trackUnknownProperties) {
      oldUnknownPropertyPaths = this.unknownPropertyPaths;
      oldKnownPropertyPaths = this.knownPropertyPaths;
    }
    let errorAtEnd = true;
    for (let i = 0; i < schema.anyOf.length; i++) {
      if (this.trackUnknownProperties) {
        this.unknownPropertyPaths = {};
        this.knownPropertyPaths = {};
      }
      let subSchema = schema.anyOf[i];

      let errorCount = this.errors.length;
      let error = this.validateAll(data, subSchema, [], [ "anyOf", i ], dataPointerPath);

      if (error === null && errorCount === this.errors.length) {
        this.errors = this.errors.slice(0, startErrorCount);

        if (this.trackUnknownProperties) {
          for (let knownKey in this.knownPropertyPaths) {
            oldKnownPropertyPaths[knownKey] = true;
            delete oldUnknownPropertyPaths[knownKey];
          }
          for (let unknownKey in this.unknownPropertyPaths) {
            if (!oldKnownPropertyPaths[unknownKey]) {
              oldUnknownPropertyPaths[unknownKey] = true;
            }
          }
          // We need to continue looping so we catch all the property definitions, but we don't want to return an error
          errorAtEnd = false;
          continue;
        }
        return null;
      }
      if (error) {
        errors.push(error.prefixWith(null, "" + i).prefixWith(null, "anyOf"));
      }
    }
    if (this.trackUnknownProperties) {
      this.unknownPropertyPaths = oldUnknownPropertyPaths;
      this.knownPropertyPaths = oldKnownPropertyPaths;
    }
    if (errorAtEnd) {
      errors = errors.concat(this.errors.slice(startErrorCount));
      this.errors = this.errors.slice(0, startErrorCount);
      return this.createError(ErrorCodes.ANY_OF_MISSING, {}, "", "/anyOf", errors, data, schema);
    }
  };
  ValidatorContext.prototype.validateOneOf = function validateOneOf(data, schema, dataPointerPath) {
    if (schema.oneOf === undefined) {
      return null;
    }
    let validIndex = null;
    let errors = [];
    let startErrorCount = this.errors.length;
    let oldUnknownPropertyPaths, oldKnownPropertyPaths;
    if (this.trackUnknownProperties) {
      oldUnknownPropertyPaths = this.unknownPropertyPaths;
      oldKnownPropertyPaths = this.knownPropertyPaths;
    }
    for (let i = 0; i < schema.oneOf.length; i++) {
      if (this.trackUnknownProperties) {
        this.unknownPropertyPaths = {};
        this.knownPropertyPaths = {};
      }
      let subSchema = schema.oneOf[i];

      let errorCount = this.errors.length;
      let error = this.validateAll(data, subSchema, [], [ "oneOf", i ], dataPointerPath);

      if (error === null && errorCount === this.errors.length) {
        if (validIndex === null) {
          validIndex = i;
        } else {
          this.errors = this.errors.slice(0, startErrorCount);
          return this.createError(ErrorCodes.ONE_OF_MULTIPLE, {
            index1: validIndex,
            index2: i
          }, "", "/oneOf", null, data, schema);
        }
        if (this.trackUnknownProperties) {
          for (let knownKey in this.knownPropertyPaths) {
            oldKnownPropertyPaths[knownKey] = true;
            delete oldUnknownPropertyPaths[knownKey];
          }
          for (let unknownKey in this.unknownPropertyPaths) {
            if (!oldKnownPropertyPaths[unknownKey]) {
              oldUnknownPropertyPaths[unknownKey] = true;
            }
          }
        }
      } else if (error) {
        errors.push(error);
      }
    }
    if (this.trackUnknownProperties) {
      this.unknownPropertyPaths = oldUnknownPropertyPaths;
      this.knownPropertyPaths = oldKnownPropertyPaths;
    }
    if (validIndex === null) {
      errors = errors.concat(this.errors.slice(startErrorCount));
      this.errors = this.errors.slice(0, startErrorCount);
      return this.createError(ErrorCodes.ONE_OF_MISSING, {}, "", "/oneOf", errors, data, schema);
    } else {
      this.errors = this.errors.slice(0, startErrorCount);
    }
    return null;
  };
  ValidatorContext.prototype.validateNot = function validateNot(data, schema, dataPointerPath) {
    if (schema.not === undefined) {
      return null;
    }
    let oldErrorCount = this.errors.length;
    let oldUnknownPropertyPaths, oldKnownPropertyPaths;
    if (this.trackUnknownProperties) {
      oldUnknownPropertyPaths = this.unknownPropertyPaths;
      oldKnownPropertyPaths = this.knownPropertyPaths;
      this.unknownPropertyPaths = {};
      this.knownPropertyPaths = {};
    }
    let error = this.validateAll(data, schema.not, null, null, dataPointerPath);
    let notErrors = this.errors.slice(oldErrorCount);
    this.errors = this.errors.slice(0, oldErrorCount);
    if (this.trackUnknownProperties) {
      this.unknownPropertyPaths = oldUnknownPropertyPaths;
      this.knownPropertyPaths = oldKnownPropertyPaths;
    }
    if (error === null && notErrors.length === 0) {
      return this.createError(ErrorCodes.NOT_PASSED, {}, "", "/not", null, data, schema);
    }
    return null;
  };
  ValidatorContext.prototype.validateHypermedia = function validateCombinations(data, schema, dataPointerPath) {
    if (!schema.links) {
      return null;
    }
    let error;
    for (let i = 0; i < schema.links.length; i++) {
      let ldo = schema.links[i];
      if (ldo.rel === "describedby") {
        let template = new UriTemplate(ldo.href);
        let allPresent = true;
        for (let j = 0; j < template.varNames.length; j++) {
          if (!(template.varNames[j] in data)) {
            allPresent = false;
            break;
          }
        }
        if (allPresent) {
          let schemaUrl = template.fillFromObject(data);
          let subSchema = { "$ref": schemaUrl };
          if ((error = this.validateAll(data, subSchema, [], [ "links", i ], dataPointerPath)) !== null) {
            return error;
          }
        }
      }
    }
  };

  // parseURI() and resolveUrl() are from https://gist.github.com/1088850
  //   -  released as public domain by author ("Yaffle") - see comments on gist
  function parseURI(url) {
    let m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(\/\/(?:[^:@]*(?::[^:@]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
    // authority = '//' + user + ':' + pass '@' + hostname + ':' port
    return (m ? {
      href: m[0] || '',
      protocol: m[1] || '',
      authority: m[2] || '',
      host: m[3] || '',
      hostname: m[4] || '',
      port: m[5] || '',
      pathname: m[6] || '',
      search: m[7] || '',
      hash: m[8] || ''
    } : null);
  }

  function resolveUrl(base, href) {// RFC 3986
    function removeDotSegments(input) {
      let output = [];
      input.replace(/^(\.\.?(\/|$))+/, '')
        .replace(/\/(\.(\/|$))+/g, '/')
        .replace(/\/\.\.$/, '/../')
        .replace(/\/?[^\/]*/g, function (p) {
          if (p === '/..') {
            output.pop();
          } else {
            output.push(p);
          }
        });
      return output.join('').replace(/^\//, input.charAt(0) === '/' ? '/' : '');
    }

    href = parseURI(href || '');
    base = parseURI(base || '');

    return !href || !base ? null : (href.protocol || base.protocol) +
      (href.protocol || href.authority ? href.authority : base.authority) +
      removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : (href.pathname ? ((base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname) : base.pathname)) +
      (href.protocol || href.authority || href.pathname ? href.search : (href.search || base.search)) +
      href.hash;
  }

  function getDocumentUri(uri) {
    return uri.split('#')[0];
  }

  function normSchema(schema, baseUri) {
    if (schema && typeof schema === "object") {
      if (baseUri === undefined) {
        baseUri = schema.id;
      } else if (typeof schema.id === "string") {
        baseUri = resolveUrl(baseUri, schema.id);
        schema.id = baseUri;
      }
      if (Array.isArray(schema)) {
        for (let i = 0; i < schema.length; i++) {
          normSchema(schema[i], baseUri);
        }
      } else {
        if (typeof schema['$ref'] === "string") {
          schema['$ref'] = resolveUrl(baseUri, schema['$ref']);
        }
        for (let key in schema) {
          if (key !== "enum") {
            normSchema(schema[key], baseUri);
          }
        }
      }
    }
  }

  function defaultErrorReporter(language) {
    language = language || 'en';
    let errorMessages = languages[language];
    return function (error) {
      let messageTemplate = errorMessages[error.code] || ErrorMessagesDefault[error.code];
      if (typeof messageTemplate !== 'string') {
        return "Unknown error code " + error.code + ": " + JSON.stringify(error.messageParams);
      }
      let messageParams = error.params;
      // Adapted from Crockford's supplant()
      return messageTemplate.replace(/\{([^{}]*)\}/g, function (whole, varName) {
        let subValue = messageParams[varName];
        return typeof subValue === 'string' || typeof subValue === 'number' ? subValue : whole;
      });
    };
  }

  let ErrorCodes = {
    INVALID_TYPE: 0,
    ENUM_MISMATCH: 1,
    ANY_OF_MISSING: 10,
    ONE_OF_MISSING: 11,
    ONE_OF_MULTIPLE: 12,
    NOT_PASSED: 13,
    // Numeric errors
    NUMBER_MULTIPLE_OF: 100,
    NUMBER_MINIMUM: 101,
    NUMBER_MINIMUM_EXCLUSIVE: 102,
    NUMBER_MAXIMUM: 103,
    NUMBER_MAXIMUM_EXCLUSIVE: 104,
    NUMBER_NOT_A_NUMBER: 105,
    // String errors
    STRING_LENGTH_SHORT: 200,
    STRING_LENGTH_LONG: 201,
    STRING_PATTERN: 202,
    // Object errors
    OBJECT_PROPERTIES_MINIMUM: 300,
    OBJECT_PROPERTIES_MAXIMUM: 301,
    OBJECT_REQUIRED: 302,
    OBJECT_ADDITIONAL_PROPERTIES: 303,
    OBJECT_DEPENDENCY_KEY: 304,
    // Array errors
    ARRAY_LENGTH_SHORT: 400,
    ARRAY_LENGTH_LONG: 401,
    ARRAY_UNIQUE: 402,
    ARRAY_ADDITIONAL_ITEMS: 403,
    // Custom/user-defined errors
    FORMAT_CUSTOM: 500,
    KEYWORD_CUSTOM: 501,
    // Schema structure
    CIRCULAR_REFERENCE: 600,
    // Non-standard validation options
    UNKNOWN_PROPERTY: 1000
  };
  let ErrorCodeLookup = {};
  for (let key in ErrorCodes) {
    ErrorCodeLookup[ErrorCodes[key]] = key;
  }
  let ErrorMessagesDefault = {
    INVALID_TYPE: "Invalid type: {type} (expected {expected})",
    ENUM_MISMATCH: "No enum match for: {value}",
    ANY_OF_MISSING: "Data does not match any schemas from \"anyOf\"",
    ONE_OF_MISSING: "Data does not match any schemas from \"oneOf\"",
    ONE_OF_MULTIPLE: "Data is valid against more than one schema from \"oneOf\": indices {index1} and {index2}",
    NOT_PASSED: "Data matches schema from \"not\"",
    // Numeric errors
    NUMBER_MULTIPLE_OF: "Value {value} is not a multiple of {multipleOf}",
    NUMBER_MINIMUM: "Value {value} is less than minimum {minimum}",
    NUMBER_MINIMUM_EXCLUSIVE: "Value {value} is equal to exclusive minimum {minimum}",
    NUMBER_MAXIMUM: "Value {value} is greater than maximum {maximum}",
    NUMBER_MAXIMUM_EXCLUSIVE: "Value {value} is equal to exclusive maximum {maximum}",
    NUMBER_NOT_A_NUMBER: "Value {value} is not a valid number",
    // String errors
    STRING_LENGTH_SHORT: "String is too short ({length} chars), minimum {minimum}",
    STRING_LENGTH_LONG: "String is too long ({length} chars), maximum {maximum}",
    STRING_PATTERN: "String does not match pattern: {pattern}",
    // Object errors
    OBJECT_PROPERTIES_MINIMUM: "Too few properties defined ({propertyCount}), minimum {minimum}",
    OBJECT_PROPERTIES_MAXIMUM: "Too many properties defined ({propertyCount}), maximum {maximum}",
    OBJECT_REQUIRED: "Missing required property: {key}",
    OBJECT_ADDITIONAL_PROPERTIES: "Additional properties not allowed",
    OBJECT_DEPENDENCY_KEY: "Dependency failed - key must exist: {missing} (due to key: {key})",
    // Array errors
    ARRAY_LENGTH_SHORT: "Array is too short ({length}), minimum {minimum}",
    ARRAY_LENGTH_LONG: "Array is too long ({length}), maximum {maximum}",
    ARRAY_UNIQUE: "Array items are not unique (indices {match1} and {match2})",
    ARRAY_ADDITIONAL_ITEMS: "Additional items not allowed",
    // Format errors
    FORMAT_CUSTOM: "Format validation failed ({message})",
    KEYWORD_CUSTOM: "Keyword failed: {key} ({message})",
    // Schema structure
    CIRCULAR_REFERENCE: "Circular $refs: {urls}",
    // Non-standard validation options
    UNKNOWN_PROPERTY: "Unknown property (not in schema)"
  };

  function ValidationError(code, params, dataPath, schemaPath, subErrors) {
    Error.call(this);
    if (code === undefined) {
      throw new Error("No error code supplied: " + schemaPath);
    }
    this.message = '';
    this.params = params;
    this.code = code;
    this.dataPath = dataPath || "";
    this.schemaPath = schemaPath || "";
    this.subErrors = subErrors || null;

    // let err = new Error(this.message);
    // this.stack = err.stack || err.stacktrace;
    // if (!this.stack) {
    //   try {
    //     throw err;
    //   } catch (err) {
    //     this.stack = err.stack || err.stacktrace;
    //   }
    // }
  }

  ValidationError.prototype = Object.create(Error.prototype);
  ValidationError.prototype.constructor = ValidationError;
  ValidationError.prototype.name = 'ValidationError';

  ValidationError.prototype.prefixWith = function (dataPrefix, schemaPrefix) {
    if (dataPrefix !== null) {
      dataPrefix = dataPrefix.replace(/~/g, "~0").replace(/\//g, "~1");
      this.dataPath = "/" + dataPrefix + this.dataPath;
    }
    if (schemaPrefix !== null) {
      schemaPrefix = schemaPrefix.replace(/~/g, "~0").replace(/\//g, "~1");
      this.schemaPath = "/" + schemaPrefix + this.schemaPath;
    }
    if (this.subErrors !== null) {
      for (let i = 0; i < this.subErrors.length; i++) {
        this.subErrors[i].prefixWith(dataPrefix, schemaPrefix);
      }
    }
    return this;
  };

  function isTrustedUrl(baseUrl, testUrl) {
    if (testUrl.substring(0, baseUrl.length) === baseUrl) {
      let remainder = testUrl.substring(baseUrl.length);
      if ((testUrl.length > 0 && testUrl.charAt(baseUrl.length - 1) === "/")
        || remainder.charAt(0) === "#"
        || remainder.charAt(0) === "?") {
        return true;
      }
    }
    return false;
  }

  let languages = {};

  function createApi(language) {
    let globalContext = new ValidatorContext();
    let currentLanguage;
    let customErrorReporter;
    let api = {
      setErrorReporter: function (reporter) {
        if (typeof reporter === 'string') {
          return this.language(reporter);
        }
        customErrorReporter = reporter;
        return true;
      },
      addFormat: function () {
        globalContext.addFormat.apply(globalContext, arguments);
      },
      language: function (code) {
        if (!code) {
          return currentLanguage;
        }
        if (!languages[code]) {
          code = code.split('-')[0]; // fall back to base language
        }
        if (languages[code]) {
          currentLanguage = code;
          return code; // so you can tell if fall-back has happened
        }
        return false;
      },
      addLanguage: function (code, messageMap) {
        let key;
        for (key in ErrorCodes) {
          if (messageMap[key] && !messageMap[ErrorCodes[key]]) {
            messageMap[ErrorCodes[key]] = messageMap[key];
          }
        }
        let rootCode = code.split('-')[0];
        if (!languages[rootCode]) { // use for base language if not yet defined
          languages[code] = messageMap;
          languages[rootCode] = messageMap;
        } else {
          languages[code] = Object.create(languages[rootCode]);
          for (key in messageMap) {
            if (typeof languages[rootCode][key] === 'undefined') {
              languages[rootCode][key] = messageMap[key];
            }
            languages[code][key] = messageMap[key];
          }
        }
        return this;
      },
      freshApi: function (language) {
        let result = createApi();
        if (language) {
          result.language(language);
        }
        return result;
      },
      validate: function (data, schema, checkRecursive, banUnknownProperties) {
        let def = defaultErrorReporter(currentLanguage);
        let errorReporter = customErrorReporter ? function (error, data, schema) {
          return customErrorReporter(error, data, schema) || def(error);
        } : def;
        let context = new ValidatorContext(globalContext, false, errorReporter, checkRecursive, banUnknownProperties);
        if (typeof schema === "string") {
          schema = { "$ref": schema };
        }
        context.addSchema("", schema);
        let error = context.validateAll(data, schema, null, null, "");
        if (!error && banUnknownProperties) {
          error = context.banUnknownProperties(data, schema);
        }
        this.error = error;
        this.missing = context.missing;
        this.valid = (error === null);

        this.toString = function () {
          if (this.error) {
            return this.error.message;
          } else {
            return 'Object passed schema validation';
          }
        };

        return this.valid;
      },
      validateResult: function () {
        let result = {};
        this.validate.apply(result, arguments);
        return result;
      },
      validateMultiple: function (data, schema, checkRecursive, banUnknownProperties) {
        let def = defaultErrorReporter(currentLanguage);
        let errorReporter = customErrorReporter ? function (error, data, schema) {
          return customErrorReporter(error, data, schema) || def(error);
        } : def;
        let context = new ValidatorContext(globalContext, true, errorReporter, checkRecursive, banUnknownProperties);
        if (typeof schema === "string") {
          schema = { "$ref": schema };
        }
        context.addSchema("", schema);
        context.validateAll(data, schema, null, null, "");
        if (banUnknownProperties) {
          context.banUnknownProperties(data, schema);
        }
        let result = {};
        result.errors = context.errors;
        result.missing = context.missing;
        result.valid = (result.errors.length === 0);
        return result;
      },
      addSchema: function () {
        return globalContext.addSchema.apply(globalContext, arguments);
      },
      getSchema: function () {
        return globalContext.getSchema.apply(globalContext, arguments);
      },
      getSchemaMap: function () {
        return globalContext.getSchemaMap.apply(globalContext, arguments);
      },
      getSchemaUris: function () {
        return globalContext.getSchemaUris.apply(globalContext, arguments);
      },
      getMissingUris: function () {
        return globalContext.getMissingUris.apply(globalContext, arguments);
      },
      dropSchemas: function () {
        globalContext.dropSchemas.apply(globalContext, arguments);
      },
      defineKeyword: function () {
        globalContext.defineKeyword.apply(globalContext, arguments);
      },
      defineError: function (codeName, codeNumber, defaultMessage) {
        if (typeof codeName !== 'string' || !/^[A-Z]+(_[A-Z]+)*$/.test(codeName)) {
          throw new Error('Code name must be a string in UPPER_CASE_WITH_UNDERSCORES');
        }
        if (typeof codeNumber !== 'number' || codeNumber % 1 !== 0 || codeNumber < 10000) {
          throw new Error('Code number must be an integer > 10000');
        }
        if (typeof ErrorCodes[codeName] !== 'undefined') {
          throw new Error('Error already defined: ' + codeName + ' as ' + ErrorCodes[codeName]);
        }
        if (typeof ErrorCodeLookup[codeNumber] !== 'undefined') {
          throw new Error('Error code already used: ' + ErrorCodeLookup[codeNumber] + ' as ' + codeNumber);
        }
        ErrorCodes[codeName] = codeNumber;
        ErrorCodeLookup[codeNumber] = codeName;
        ErrorMessagesDefault[codeName] = ErrorMessagesDefault[codeNumber] = defaultMessage;
        for (let langCode in languages) {
          let language = languages[langCode];
          if (language[codeName]) {
            language[codeNumber] = language[codeNumber] || language[codeName];
          }
        }
      },
      reset: function () {
        globalContext.reset();
        this.error = null;
        this.missing = [];
        this.valid = true;
      },
      missing: [],
      error: null,
      valid: true,
      normSchema: normSchema,
      resolveUrl: resolveUrl,
      getDocumentUri: getDocumentUri,
      errorCodes: ErrorCodes
    };
    api.language(language || 'en');
    return api;
  }

  let tv4 = createApi();
  tv4.addLanguage('en-gb', ErrorMessagesDefault);
  tv4.addFormat('hostname', (data, schema) => {
    if (typeof data === 'string' && /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i.test(data)) {
      return null;
    }
    return "must be host name according to RFC1034";
  });
  //legacy property
  tv4.tv4 = tv4;
  return tv4; // used by _header.js to globalise.
}));
