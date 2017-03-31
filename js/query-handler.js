
function QueryHandler(config) {
  var self = this;
  var suffixField;
  var tempConf;
  var tempPop;

  // Array.isArray polyfill
  if (!Array.isArray) {
    Array.isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    };
  }

  // Operator settings
  this._operatorList = {
    '$eq': 'value',
    '$gt': 'value',
    '$gte': 'value',
    '$lt': 'value',
    '$lte': 'value',
    '$ne': 'value',
    '$type': 'value',
    '$not': 'value',
    '$size': 'value',
    '$exists': 'boolean',
    '$in': 'arrayValues',
    '$nin': 'arrayValues',
    '$mod': 'arrayValues',
    '$all': 'arrayValues',
    '$regex': 'arrayValues',
    '$or': 'arrayExpressions',
    '$nor': 'arrayExpressions',
    '$and': 'arrayExpressions'
  };

  // Pagination setting
  this._userFriendlyPaging = config.userFriendlyPaging === false ? false : true;
  this._offsetName = config.offsetName || 'page';
  this._limitName = config.limitName || 'per_page';

  // Define fields that are allowed to be returned
  this._validateReturnedFields = config.validateReturnedFields || false;

  // Allow all fields if fields not specified
  this._allowedFields = null;

  if (Array.isArray(config.allowedFields) && config.allowedFields.length) {
    this._allowedFields = {};
    config.allowedFields.forEach(function(field) {
      self._allowedFields[field] = true;
    });
  }

  if (Array.isArray(config.defaultFields) && this._allowedFields) {
    // Check defaults against allowed when both exist
    this._defaultFields = intersectionPolly(Object.keys(this._allowedFields), config.defaultFields);
  } else if (!Array.isArray(config.defaultFields) && this._allowedFields) {
    // Set defaults to allowed when allowed exists but no defaults
    this._defaultFields = Object.keys(this._allowedFields);
  } else if (Array.isArray(config.defaultFields)) {
    // Set defaults unadultered when defaults and all are allowed
    this.defaultFields = config.defaultFields;
  } else {
    // Set defaults to null (returns all) when nothing given
    this._defaultFields = null;
  }

  // Format defaults for mongoose
  if (this._defaultFields && Array.isArray(this._defaultFields)) {
    this._defaultFields = this._defaultFields.join(' ');
  }

  // Set fields that are eligible for population
  // Will work with nested fields if written as dot notation in a string. 
    // Example: 'main.sub.last'
  this._populateSuffix = config.populateSuffix || '-populate';
  this._populateConfig = {};
  if (config.populateFields) {
    for (var field in config.populateFields) {
      suffixField = field + this._populateSuffix;
      tempConf = config.populateFields[field];
      tempPop = {};

      // Populated fields must be captured in allowed fields
      if (this._allowedFields[field] || this._allowedFields === null) {
        // Set suffixed property on populateConfig block  
        if(Array.isArray(tempConf.allowedFields)) {
          tempPop.allowedFields = {};
          tempConf.allowedFields.forEach(function(field) {
            tempPop.allowedFields[field] = true;
          });
        } else {
          tempPop.allowedFields = null;
        }

        // Set default fields based on allowed fields
        if(tempPop.allowedFields === null) {
          tempPop.defaultFields = Array.isArray(tempConf.defaultFields) ? tempConf.defaultFields : null;
        } else {
          tempPop.defaultFields = Array.isArray(tempConf.defaultFields) ? intersectionPolly(tempConf.defaultFields, tempConf.allowedFields) : tempConf.allowedFields;
        }

        this._populateConfig[suffixField] = tempPop;
      }
    };
  }

};

// limited representation of .assign - not ES compliant
var assignPolly = function() {
  var args = Array.prototype.slice.call(arguments);

  var item = args.shift();

  args.forEach(function(arg) {
    Object.keys(arg).forEach(function(property) {
      item[property] = arg[property];
    });
  });

  return item;
};

// limited representation of .intersection - not ES compliant
var intersectionPolly = function() {
  var args = Array.prototype.slice.call(arguments);
  var tally = {};
  var fullIntersect = [];

  args.forEach(function(arg) {
    arg.forEach(function(item) {
      if (!tally[item]) {
        tally[item] = 1;
        return;
      }
      tally[item]++;
    });
  });

  for (var key in tally) {
    if (tally[key] === args.length) {
      fullIntersect.push(key);
    }
  }

  return fullIntersect;
};