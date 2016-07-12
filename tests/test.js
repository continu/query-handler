var QueryHandler = require('../js/query-handler');

describe('QueryHandler', function(){

  it('should create a wildcard handler with no inputs', function(done){
    var queryHandler = new QueryHandler({});
    
    var test = queryHandler.handleQuery({
      fields: 'one,two',
      per_page: 1,
      page: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo'
    });

    test.should.have.property('fields', 'one two');
    test.should.have.property('pageSort');
    test.pageSort.should.have.property('limit', 1);
    test.pageSort.should.have.property('skip', 0);
    test.should.have.property('opts');
    test.opts.should.have.property('toOptionsOne', 'setMe');
    test.opts.should.have.property('toOptionsTwo', 'setMeToo');
    done();
  });

  it('should create defaults based on allowed when not given', function(done){
    var queryHandler = new QueryHandler({
      allowedFields: ['one']
    });
    
    var test = queryHandler.handleQuery({
      fields: 'one,two',
      per_page: 1,
      page: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo'
    });

    test.should.have.property('fields', 'one two');
    test.should.have.property('pageSort');
    test.pageSort.should.have.property('limit', 1);
    test.pageSort.should.have.property('skip', 0);
    test.should.have.property('opts');
    test.opts.should.not.have.property('toOptionsOne');
    test.opts.should.not.have.property('toOptionsTwo');
    done();
  });

  it('should use default fields when none given', function(done){
    var queryHandler = new QueryHandler({
      allowedFields: ['one', 'two', 'three'],
      defaultFields: ['three']
    });
    
    var test = queryHandler.handleQuery({
      per_page: 1,
      page: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo'
    });

    test.should.have.property('fields', 'three');
    test.should.have.property('pageSort');
    test.pageSort.should.have.property('limit', 1);
    test.pageSort.should.have.property('skip', 0);
    test.should.have.property('opts');
    test.opts.should.not.have.property('toOptionsOne');
    test.opts.should.not.have.property('toOptionsTwo');
    done();
  });

  it('should require fields to be validated', function(done){
    var queryHandler = new QueryHandler({
      allowedFields: ['one'],
      validateReturnedFields: true
    });
    
    var test = queryHandler.handleQuery({
      fields: 'one,two',
      per_page: 1,
      page: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo'
    });

    test.should.have.property('fields', 'one');
    test.should.have.property('pageSort');
    test.pageSort.should.have.property('limit', 1);
    test.pageSort.should.have.property('skip', 0);
    test.should.have.property('opts');
    test.opts.should.not.have.property('toOptionsOne');
    test.opts.should.not.have.property('toOptionsTwo');
    done();
  });

  it('should allow changing pagination terms and set default fields to' + 
     ' allowedFields when not specified', function(done){

    var queryHandler = new QueryHandler({
      allowedFields: ['one', 'two', 'toOptionsOne', 'toOptionsTwo'],
      validateReturnedFields: true,
      limitName: 'crazy',
      offsetName: 'crazier'
    });
    
    var test = queryHandler.handleQuery({
      crazy: 1,
      crazier: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo'
    });

    test.should.have.property('fields', 'one two toOptionsOne toOptionsTwo');
    test.should.have.property('pageSort');
    test.pageSort.should.have.property('limit', 1);
    test.pageSort.should.have.property('skip', 0);
    test.should.have.property('opts');
    test.opts.should.have.property('toOptionsOne');
    test.opts.should.have.property('toOptionsTwo');
    done();
  });

  it('should create populated fields based on config default', function(done){
    var queryHandler = new QueryHandler({
      allowedFields: ['one', 'two', 'three', 'user'],
      defaultFields: ['three'],
      populateFields: {
        user: {
          allowedFields: ['first_name', 'last_name'],
          defaultFields: ['first_name']
        }
      }
    });
    
    var test = queryHandler.handleQuery({
      fields: 'one,two',
      per_page: 1,
      page: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo',
      'user-populate': true
    });

    test.should.have.property('fields', 'one two');
    test.should.have.property('pageSort');
    test.pageSort.should.have.property('limit', 1);
    test.pageSort.should.have.property('skip', 0);
    test.should.have.property('opts');
    test.opts.should.not.have.property('toOptionsOne');
    test.opts.should.not.have.property('toOptionsTwo');
    test.should.have.property('user-populate', 'first_name');
    done();
  });

  it('should default populated fields to allowed Fields when none given', function(done){
    var queryHandler = new QueryHandler({
      allowedFields: ['one', 'two', 'three', 'user'],
      defaultFields: ['three'],
      populateFields: {
        user: {
          allowedFields: ['first_name', 'last_name']
        }
      }
    });
    
    var test = queryHandler.handleQuery({
      fields: 'one,two',
      per_page: 1,
      page: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo',
      'user-populate': true
    });

    test.should.have.property('fields', 'one two');
    test.should.have.property('pageSort');
    test.pageSort.should.have.property('limit', 1);
    test.pageSort.should.have.property('skip', 0);
    test.should.have.property('opts');
    test.opts.should.not.have.property('toOptionsOne');
    test.opts.should.not.have.property('toOptionsTwo');
    test.should.have.property('user-populate', 'first_name last_name');
    done();
  });

  it('should not get fields that arent allowed', function(done){
    var queryHandler = new QueryHandler({
      allowedFields: ['one', 'two', 'three', 'user'],
      defaultFields: ['three'],
      populateFields: {
        user: {
          allowedFields: ['first_name', 'last_name']
        }
      }
    });
    
    var test = queryHandler.handleQuery({
      fields: 'one,two',
      per_page: 1,
      page: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo',
      'user-populate': 'first_name,full_name'
    });

    test.should.have.property('fields', 'one two');
    test.should.have.property('pageSort');
    test.pageSort.should.have.property('limit', 1);
    test.pageSort.should.have.property('skip', 0);
    test.should.have.property('opts');
    test.opts.should.not.have.property('toOptionsOne');
    test.opts.should.not.have.property('toOptionsTwo');
    test.should.have.property('user-populate', 'first_name');
    done();
  });

  it('should wildcard populate field with no properties given', function(done){
    var queryHandler = new QueryHandler({
      allowedFields: ['one', 'two', 'three', 'user'],
      defaultFields: ['three'],
      populateFields: {
        user: true
      }
    });
    
    var test = queryHandler.handleQuery({
      fields: 'one,two',
      per_page: 1,
      page: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo',
      'user-populate': 'getThis,andThis'
    });

    test.should.have.property('fields', 'one two');
    test.should.have.property('pageSort');
    test.pageSort.should.have.property('limit', 1);
    test.pageSort.should.have.property('skip', 0);
    test.should.have.property('opts');
    test.opts.should.not.have.property('toOptionsOne');
    test.opts.should.not.have.property('toOptionsTwo');
    test.should.have.property('user-populate', 'getThis andThis');
    done();
  });

  it('should handle Query Operators', function(done){
    var queryHandler = new QueryHandler({
      allowedFields: ['one', 'two', 'three', 'user'],
      defaultFields: ['three'],
      populateFields: {
        user: true
      }
    });
    
    var test = queryHandler.handleQuery({
      fields: 'one,two',
      one: 'hasprop,$exists,true,price,12,qty,2,location,$gte,5,name,thisname',
      per_page: 1,
      page: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo',
      'user-populate': 'getThis,andThis'
    });


    test.opts.one.should.have.property('hasprop');
    test.opts.one.hasprop.should.have.property('$exists', true);
    test.opts.one.should.have.property('price', '12');
    test.opts.one.should.have.property('qty', '2');
    test.opts.one.should.have.property('location');
    test.opts.one.location.should.have.property('$gte', '5');
    test.opts.one.should.have.property('name', 'thisname');
    done();
  });

  it('should handle Logical Operators', function(done){
    var queryHandler = new QueryHandler({
      allowedFields: ['one', 'two', 'three', 'user'],
      defaultFields: ['three'],
      populateFields: {
        user: true
      }
    });
    
    var test = queryHandler.handleQuery({
      fields: 'one,two',
      '$or': '7,price,12,qty,2,location,$gte,5',
      per_page: 1,
      page: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo',
      'user-populate': 'getThis,andThis'
    });

    test.opts.$or[0].should.have.property('price', '12');
    test.opts.$or[1].should.have.property('qty', '2');
    test.opts.$or[2].should.have.property('location');
    test.opts.$or[2].location.should.have.property('$gte', '5');
    done();
  });

  it('should handle Logical Operators and', function(done){
    var queryHandler = new QueryHandler({
      allowedFields: ['one', 'two', 'three', 'user'],
      defaultFields: ['three'],
      populateFields: {
        user: true
      }
    });
    
    var test = queryHandler.handleQuery({
      fields: 'one,two',
      '$and': '7,price,12,qty,2,location,$gte,5',
      per_page: 1,
      page: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo',
      'user-populate': 'getThis,andThis'
    });

    test.opts.$and[0].should.have.property('price', '12');
    test.opts.$and[1].should.have.property('qty', '2');
    test.opts.$and[2].should.have.property('location');
    test.opts.$and[2].location.should.have.property('$gte', '5');
    done();
  });

  it('should handle array Operators and', function(done){
    var queryHandler = new QueryHandler({
      allowedFields: ['one', 'two', 'three', 'user'],
      defaultFields: ['three'],
      populateFields: {
        user: true
      }
    });
    
    var test = queryHandler.handleQuery({
      fields: 'one,two',
      one: '$nin,4,1,2,3,4',
      per_page: 1,
      page: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo',
      'user-populate': 'getThis,andThis'
    });

    test.opts.one.should.have.property('$nin');
    test.opts.one.$nin.length.should.equal(4);
    done();
  });

  it('should handle array Operators $regex', function(done){
    var queryHandler = new QueryHandler({
      allowedFields: ['one', 'two', 'three', 'user'],
      defaultFields: ['three'],
      populateFields: {
        user: true
      }
    });
    
    var test = queryHandler.handleQuery({
      fields: 'one,two',
      one: '$regex,2,title,i',
      per_page: 1,
      page: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo',
      'user-populate': 'getThis,andThis'
    });
    test.opts.one.should.have.property('$regex');
    done();
  });

  it('should handle $or with the same fields', function(done){
    var queryHandler = new QueryHandler({
      allowedFields: ['one', 'two', 'three', 'user'],
      defaultFields: ['three'],
      populateFields: {
        user: true
      }
    });

    var test = queryHandler.handleQuery({
      fields: 'one,two',
      '$or': '8,filtered_location,null,filtered_location,$size,0,filtered_location,$exists,false',
      per_page: 1,
      page: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo',
      'user-populate': 'getThis,andThis'
    });

    test.opts['$or'][0].should.have.property('filtered_location', null);
    test.opts['$or'][1].should.have.property('filtered_location');
    test.opts['$or'][1]['filtered_location'].should.have.property('$size', '0');
    test.opts['$or'][2].should.have.property('filtered_location');
    test.opts['$or'][2]['filtered_location'].should.have.property('$exists', false);
    done();
  });

  it('should handle complex $or with nested array expressions', function(done){
    var queryHandler = new QueryHandler({
      allowedFields: ['one', 'two', 'three', 'user'],
      defaultFields: ['three'],
      populateFields: {
        user: true
      }
    });

    var test = queryHandler.handleQuery({
      fields: 'one,two,three',
      '$or': '25,one,$regex,2,first,i,one,$regex,2,secondfirst,i,two,$regex,2,first,i,two,$nin,4,1,2,3,4,three,$exists,true',
      per_page: 1,
      page: 1,
      toOptionsOne: 'setMe',
      toOptionsTwo: 'setMeToo',
      'user-populate': 'getThis,andThis'
    });

    test.opts.$or[0].should.have.property('one');
    test.opts.$or[0].one.should.have.property('$regex', /first/i);
    test.opts.$or[1].should.have.property('one');
    test.opts.$or[1].one.should.have.property('$regex', /secondfirst/i);
    test.opts.$or[2].should.have.property('two');
    test.opts.$or[2].two.should.have.property('$regex', /first/i);
    test.opts.$or[3].should.have.property('two');
    test.opts.$or[3].two['$nin'][0].should.equal('1');
    test.opts.$or[3].two['$nin'][1].should.equal('2');
    test.opts.$or[3].two['$nin'][2].should.equal('3');
    test.opts.$or[3].two['$nin'][3].should.equal('4');
    test.opts.$or[4].should.have.property('three');
    test.opts.$or[4].three['$exists'].should.equal(true);
    done();
  });

});

