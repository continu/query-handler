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