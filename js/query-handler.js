
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

// calculate paging based on config
QueryHandler.prototype.calculatePagination = function(perPage, page) {
  if(this._userFriendlyPaging) {
    return {
      skip: perPage * (page - 1),
      limit: perPage
    };
  }

  return {
    skip: page,
    limit: perPage
  };
};

// A check for date types
QueryHandler.prototype._operatorType = function(value) {
  if(value.slice(0, 5) === 'date-') {
    return new Date(value.slice(5));
  }

  return value;
};

// Function returns a query value formatted correctly in reference to the provided operator and arguments
QueryHandler.prototype._operatorFormat = function(operator) {
  // operator is the only named argument, other arguments are expected but dynamic based on the operator

  // set the format of the operator based on the available operator list
  var format = this._operatorList[operator];
  var self = this;
  var conditions;
  var temp;
  var hold;
  var finalValue = {};
  // Don't allow un-approved operators that may not be read only
  if (!format && operator[0] === '$') {
    return;
  }
  conditions = Array.prototype.slice.call(arguments, 1);
  switch (format) {
    case 'value':
      finalValue[operator] = this._operatorType(conditions[0]);
      return finalValue;
      break;

    case 'boolean':
      finalValue[operator] = conditions[0] === 'true' ? true : false;
      return finalValue;
      break;

    case 'arrayValues':
      if (operator === '$regex') {
        finalValue[operator] = new RegExp(conditions[0], conditions[1]);
        return finalValue;
      }

      conditions = conditions.map(function(item) {
        return self._operatorType(item);
      });
      finalValue[operator] = conditions;

      return finalValue;
      break;

    case 'arrayExpressions':
      temp = [];
      // Array expression conditions go back through the operator digest as 
      // each condition has the potential to be another operator
      hold = this._operatorDigest(conditions);

      finalValue[operator] = [hold];
      return finalValue;
      break;

    default:
      finalValue[operator] = conditions[0];
      return finalValue;
      break;
  }

};

// Function to process each known operator for proper formatting
QueryHandler.prototype._operatorDigest = function() {
  var flags = {g: true, i: true, m: true, u: true, y: true};
  var randomList = 'abcdefghijklmnopqrstuvwxyz';
  var conditions = Array.prototype.slice.call(arguments, 0);
  var finalValue = {};
  var tempBlock = {};
  var replaceBlock = null;
  var tempReplace = '';
  var checkItem;
  var temp;
  var args;
  if (conditions.length < 1) {
    return;
  }

  // Remove each related section of conditions and properly format them for query
  while (conditions.length > 1) {
    if (conditions[0][0] !== '$' && conditions[1][0] === '$') {
      // Scenario where the first and second arguments appear to be operators
      checkItem = this._operatorList[conditions[1]];
      if (checkItem === 'arrayValues' || checkItem === 'arrayExpressions') {
        // Array values pass in the number of related arguments that follow (since it is otherwise unknown)
        // the 3 comes from the first argument and number itself needing to be included
        args = conditions.slice(1, parseInt(conditions[2]) + 3);
        args.splice(1,1);
        finalValue[conditions[0]] = this._operatorFormat.apply(this, args);
        conditions = conditions.slice(parseInt(conditions[2]) + 3);
      } else {
        // If the second condition is not an array type, then its sage to assume the first condition is equal to the formated second and third
        finalValue[conditions[0]] = this._operatorFormat.apply(this, conditions.slice(1,3));
        conditions = conditions.slice(3);
      }
    } else if (conditions[0][0] !== '$' && conditions[1][0] !== '$') {
      // Scenario where the first and the second conditions are not operators
      finalValue[conditions[0]] = conditions[1];
      conditions = conditions.slice(2);
    } else if (conditions[0][0] === '$') {
      // Scenario where the first condition is an operator and the second is not
      checkItem = this._operatorList[conditions[0]];
      if (checkItem === 'arrayExpressions') {
        args = conditions.slice(2, conditions[1] + 2);
        for (var j = 0; j < args.length; j++) {
          // check if number
          if (/^\d+$/.test(args[j])) {
            continue;
          }

          // This block is required to include multiple of the same field within an $or statement (ie $or: [{name: 'mike'}, {name: 'franky'}]) by associating the field with a key (as not to overwrite the initial statement in recursion).  This statement is to protect repeated items from being encoded and associated because they are not returned to their original state after recursion.
          if (tempBlock[args[j]] && !this._operatorList[args[j]] && !(tempBlock['$regex'] && flags[args[j]]) && !(tempBlock['$regex'] && flags[args[j + 1]])) {
            if (!replaceBlock) {
              replaceBlock = {};
            }
            tempReplace = '';
            for (var i = 0; i < 10; i++) {
              tempReplace += randomList[Math.round(Math.random() * (randomList.length - 1))];
            }
            replaceBlock[tempReplace] = args[j];
            args[j] = tempReplace;
            tempReplace = '';
          } else {
            tempBlock[args[j]] = true;
          }
        }
        tempBlock = {};
        finalValue[conditions[0]] = [];
        // recurse through the remaining arguments
        temp = this._operatorDigest.apply(this, args);

        if(typeof temp !== 'object') {
          console.error('please supply the amount of arguments to the logical/array operator');
        }

        Object.keys(temp).forEach(function(key) {
          var hold = {};
          temp[key] = temp[key] === 'null' ? null : temp[key];
          if (replaceBlock && replaceBlock[key]) {
            hold[replaceBlock[key]] = temp[key];
          } else {
            hold[key] = temp[key];
          }
          finalValue[conditions[0]].push(hold);
        });
        conditions = conditions.slice(conditions[1] + 2);
      } else if (checkItem === 'arrayValues') {
        args = [conditions[0]].concat(conditions.slice(2, conditions[1] + 2));
        assignPolly(finalValue, this._operatorFormat.apply(this, args));
        conditions = conditions.slice(conditions[1] + 2);
      } else {
        assignPolly(finalValue, this._operatorFormat.apply(this, conditions.slice(0, 2)));
        conditions = conditions.slice(2);
      }
    } else {
      console.log('Not a recognized format');
      return;
    }
  }
  // return the final formatted value
  return finalValue;
};

// Function that handles each query.
// Can take either an object of the requested query or the query string
QueryHandler.prototype.handleQuery = function(query) {
  var self = this;
  var temp;
  var config;
  var checkFields;
  var splitItem;
  var original;
  var mongoosify = {
    fields: this._defaultFields,
    opts: {},
    pageSort: {
      sort: {}
    }
  };
  // handle the query string itself if provided
  if(typeof query === 'string') {
    query = unescape(query);
    query = query.substr(query.indexOf("?") + 1);
    var tempQuery = {};
    query = query.split('&');
    query.forEach(function(item){
      item = item.split('=');
      tempQuery[item[0]] = item[1];
    });
    query = tempQuery;
  }

  // Review each item in the query for eligibility and build it into the return
  for (var item in query) {
    
    if (item.match(this._populateSuffix)) {
      original = item;
      item = '-populate-';
    }

    switch (item) {
      case 'fields':
        if (this._validateReturnedFields && this._allowedFields !== null) {
          // Validate eligibility of all requested fields
          checkFields = query[item].split(',');
          mongoosify.fields = [];
          checkFields.forEach(function(field) {
            if (self._allowedFields[field]) {
              mongoosify.fields.push(field);
            }
          });
          mongoosify.fields = mongoosify.fields.join(' ');
        } else {
          // No validation required
          mongoosify.fields = query[item].replace(/,/gi, ' ');
        }

        break;

      case 'sort':
        // Set the requested sort parameter
        splitItem = query[item].split(',');
        if (splitItem.length > 1) {
          temp = mongoosify.pageSort.sort;
          for (var i = 0; i < splitItem.length; i += 2) {
            temp[splitItem[i]] = parseInt(splitItem[i+1]);
          }
        }

        break;

      case '-populate-':
        // handle requested field population
        if (!this._populateConfig[original]) break;
        config = this._populateConfig;
        temp = '';

        if (typeof query[original] === 'string' && config[original].allowedFields) {
          query[original].split(',').forEach(function(field) {
            if(config[original].allowedFields[field]) {
              temp += (temp === '' ? '' : ' ') + field;
            }
          });
          mongoosify[original] = temp;
        } else if (typeof query[original] === 'string') {
          mongoosify[original] = query[original].split(',').join(' ');
        } else if (config[original].defaultFields) {
          mongoosify[original] = config[original].defaultFields.join(' ');
        }
        break;

      case this._offsetName:
        assignPolly(mongoosify.pageSort, this.calculatePagination(parseInt(query[this._limitName]), parseInt(query[this._offsetName])));
        break;

      case this._limitName:
        break;

      case '$or':
        splitItem = query[item].split(',');
        assignPolly(mongoosify.opts, this._operatorDigest.apply(this, ['$or'].concat(splitItem)));
        break;

      case '$and':
        splitItem = query[item].split(',');
        assignPolly(mongoosify.opts, this._operatorDigest.apply(this, ['$and'].concat(splitItem)));
        break;

      case '$nor':
        splitItem = query[item].split(',');
        assignPolly(mongoosify.opts, this._operatorDigest.apply(this, ['$nor'].concat(splitItem)));
        break;

      default:
        if (this._allowedFields !== null && !this._allowedFields[item]) {
          break;
        }
        
        splitItem = query[item].split(',');
        mongoosify.opts[item] = splitItem.length > 1 ? this._operatorDigest.apply(this, splitItem) : splitItem[0];
        break;
    }

  };

  return mongoosify;
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

module.exports = QueryHandler;
