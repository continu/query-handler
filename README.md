# Query Handler

The query handler extends the read only operations of mongoDB with mongoose to client side requests through the query string.


## Configure

While configuring can be tedious and potentially ugly, it forces a mindful approach as to which properties are allowed to be returned and filtered.

Here is a full example of a query handler configured for articles:

```
var QueryHandler = require('QueryHandler');

var queryHandler = new QueryHandler({
  allowedFields: ['user', 'title', 'author', 'link', 'summary', 'content', 'image', 'banner_image', 'tags', 'category', 'createdAt', 'duration'],
  defaultFields: ['title', 'author', 'link', 'summary', 'content', 'image', 'banner_image'],
  populateFields: {
    user: {
      allowedFields: ['first_name', 'last_name', 'full_name', 'email', 'role'],
      defaultFields: ['first_name', 'last_name', 'full_name', 'email']
    }
  },
  validateReturnedFields: true
});
```

`allowedFields` - an array of strings representing document properties that can be used as filters.  So, if you want to filter where the title is "Awesome Article" then title must be included in the allowedFields array.

`defaultFields` - an array of document properties to be returned in the event that `fields` is not set in the query string

`validateReturnedFields` - boolean that defaults to false. when set to true, any properties requested in the `fields=` section of the query string must also be contained within the `allowedFields` configuration.

### Population Settings

`populateFields` - an object containing each document property that contains a reference to another document that you want to be able to populate.  Including the reference in this block does not mean you have to populate it on every return - it just allows for it.  In this case, user is a reference to a document in the users collection. Each reference is an object with 2 properties.  `allowedFields` are the fields in the user document that can be returned from the population, and `defaultFields` will be returned if none are specified.

`populateSuffix` - string that defaults to `-populate` unless otherwise supplied.  This is used in populating references via the query string. In the above case, we could declare: `?fields=user&user-populate=first_name,last_name` to return only the first and last name of the user. If we set the string equal to `-get` in the configuration, then that same request would look like this: `?fields=user&user-get=first_name,last_name`

### Pagination Settings

`offsetName` - string that defaults to `page`. This is the offset used for pagination.

`limitName` - string that defaults to `per_page`. This is the limit used for pagination.

`userFriendlyPaging` - boolean that defaults to true. When true, pagination is calculated on a page/per page basis. That is to say the offset is calculated based on which page is requested and the given limit. Set it to false for the traditional offset/limit approach.



## Mongoose Method Set-up

Within the method, simply pass the query as the only argument to the `handleQuery` method of the query handler instance: 
`var criterion = queryHandler.handleQuery(req.query);`

The handleQuery function can also handle the query string itself. In fact, this is preferred (necessary depending on mongoose version) when using dot notation to populate nested records:
`var criterion = queryHandler.handleQuery(req.url);`

This will return an object with 3 standard properties:

`opts` - an object containing requested filtering parameters.

`fields` - a space delimited string of fields to be returned.

`pageSort` - an object containing pagination and sort parameters.

Additionally, the object may contain a property for any field population requests. This will be a space delimited string of fields to be populated for the specified reference.

** NOTE: To mandate a document value like company on every use, set the value after creating the parameters:
```
var criterion = queryHandler.handleQuery(req.query);
criterion.opts.company = req.company.id;
```

Now pass the newly created configuration into the methods.  `find` and `findOne` follow the same pattern:
```
Article.find(criterion.opts, criterion.fields, criterion.pageSort)
```

Whereas findOneAndUpdate is slightly different:
```
Article.findOneAndUpdate(criterion.opts, body, {select: criterion.fields})
```

Configuring for population, while not ideal, looks something like this:
```
  Article.find(criterion.opts, criterion.fields, criterion.pageSort)
  .populate(criterion['user-populate'] ? 'user' : 'noFind', criterion['user-populate'])
  .exec(function (err, users) {
    // Do stuff and send response
  });
```
Here we are setting the population parameters based on whether or not the item is requested.  If the query string contained `..&user-populate=first_name,last_name` then the object returned from handleQuery(q) will contain a property `user-populate` which is set to `first_name last_name`.  We first check if that property exists if it does we want to populate `user` (not `user-populate`) otherwise we give the population a string value that does not exist as a property of the document - the population will be ignored.




## The Query String

There are a few terms reserved for use with the query that should not be used as property names in the model. These include `fields`, `sort`, and the offset/limit names which default to `page`, `per_page`, `$or`, `$and`, and `$nor`.

The query handler is set to parse a limited version of MongoDB's query operators. The syntax is as follows:

query string:
```
?price=$gte,12
```
Mongo query: 
```
{ 
  price: {
    $gte: 12
  }
}
```

Here is a sample list of some query strings and results:

`?fields=title,createdAt` - This will return only the two fields requested of the article(s).

`?fields=title,createdAt&category=leadership` - This will return the exact same response as above. It will **NOT** be filtered by the given category.  This is because `category` cannot be used as a filter unless it is also returned as a field.

`?fields=title,createdAt,category&category=leadership` - Assuming this was attached to a request for all articles, this will return only the three provided fields for each article with a category that is set to `leadership`.

`?fields=title,createdAt,category&category=$ne,leadership` - This returns the articles not returned in the response above with the same fields in the response.

`?fields=title,duration&sort=duration,1` - This response will be in ascending order by duration. **Note:** this only works because duration is also a returned field.

`?fields=title,duration&sort=duration,1&page=1&per_page=5` - This response will contain only the first 5 documents from the response above.

`?fields=title,createdAt&createdAt=$lte,date-07-20-14` - This response will return all documents created before July 20th, 2014.  All dates must be provided in `date-MM-DD-YY` format to be recognized as such.

`?fields=title,user&user-populate=first_name,last_name` - Assuming this request was for a single document, it would return the title of the document as well as the user object with fields first_name and last_name present.


## Supported Operators

### Value Types - these are in the mold of {$operator: value}
```
    $eq
    $gt
    $gte
    $lt
    $lte
    $ne
    $type
    $not
    $size
```

### Boolean type - the same as value types except the value must be `true` or `false`
```
    $exists
```

### Array Value types - these are in the mold of {$operator: [array of values]}
```
    $in
    $nin
    $mod
    $all
    $regex
```
When using array values in the query string, the number of items in the array must be the first item following the operator in the query string. example:
`?fields=_id,first_name,last_name&_id=$in,3,id1,id2,id3`
This would return all existing users with an id of id1, id2, or id3.
** NOTE: Although all mongo queries return _id, it still needs to be included in the returned fields in order to be used in filtering operation.

### Array Expression Types - similar to array value types, but deeper
```
    $or
    $nor
    $and
```
When using array expression types, the first item following the operator must be the number of relavent statements
`?fields=name,email,image&$or=12,name,tina,name,tom,name,$ne,mike,name,$in,2,alex,ray`
This would result in the following query:
```
{
  $or: [
    {name: 'tina'},
    {name: 'tom'},
    {name: {$ne: 'mike;}},
    {name: {$in: ['alex', 'ray']}
  ]
}
```
