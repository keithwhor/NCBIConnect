NCBIConnect.js
==============

Introduction
------------

NCBIConnect.js is a client-side JavaScript library that provides a simple,
hassle-free interface to some of the National Center for Biotechnology
Information's databases.

Right now, the *nucleotide* (nuccore) and *protein* databases are supported
(you can search for nucleic acid or protein sequences by name). Support
for gene data should arrive in the next build.


Primary Objective
-----------------

The primary objective of this project is to encourage talented
bioinformaticians and web developers to find more common ground and begin taking
more projects to the beautiful, dynamic, modern web with JavaScript.

NCBIConnect can be used as a starting point to develop webapps that rely on
NCBI's databases without having to set up a server environment - all
processing is done client-side.

NCBIConnect can also be used to write simple data collection scripts (in much
fewer lines) that can be shared easily as .html files. No Perl required!

(You can also consider writing your own data processing applications and
scripts without having to save or load from local data!)


Installation
------------

Simply download ```ncbiconnect.js``` and incorporate it into your webpage using:

```html
<script src="ncbiconnect.js"></script>
```

Voila! (Make sure it's in the same directory, otherwise specify the relative
path.)


Example Usage
-------------

Let's say I'm interested in the genome of a specific virus. In this case, it's
the much-studied bacteriophage T4.

I want to grab the top 5 hits from NCBI's nucleotide database for T4's genome,
and store it in a single FASTA file.

Easy!

```javascript
var nucDB = new NCBIConnect('nucleotide');

nucDB.query(
   'Bacteriophage T4', // My search term
   {'limit': 5, 'offset': 0}, // Give 5 results, starting at 0
   function(err, result) {
      if(err) { throw err; }

      result.getFASTA(function(err, fasta) {
         if(err) { throw err; }

         fasta.save();

      });

   }
);
```

Assuming we don't hit any errors with NCBI's servers, a file should
automatically be downloaded to our computer's ```Downloads``` folder when we run
this script.


**What about listing results?**

Simple!

```javascript
nucDB.query(
   'Bacteriophage T4', // My search term
   {'limit': 5, 'offset': 0}, // Give 5 results, starting at 0
   function(err, result) {
      if(err) { throw err; }
      result.each(function(row) {
         console.log(row.get('id') + ', ' + row.get('name'));
      });
   }
);
```

We now see a lovely output in our console:

```javascript
29366675, Enterobacteria phage T4, complete genome
422934005, Enterobacteria phage Bp7, complete genome
161622381, Enterobacteria phage JS98, complete genome
291290213, Enterobacteria phage AR1 DNA, complete genome
345450514, Enterobacteria phage Bp7, complete genome
```


**New to HTML?**

You may have written some Perl but you're unfamiliar with
throwing together a webpage. No problem! Included with this package is
```index.html```, a sample index page containing the latter example above.

It will execute on page load so make sure you have your web console open to see
it work!

There are also a number of useful methods to be used with results (and FASTA
files). Explore them in the documentation!

**Happy building!**


Documentation
=============


NCBIConnect.js contains the following objects:

```NCBIConnect``` is the main connection object, it manages queries to NCBI's
servers

```NCBIConnectRow``` is a result row (from a query to NCBI's databases)

```NCBIConnectSet``` is a set of ```NCBIConnectRow```s

```NCBIConnectResult``` inherits from ```NCBIConnectSet``` and is the result
object that contains one or many results of a specific query from ```NCBIConnect```

```NCBIConnectCollection``` inherits from ```NCBIConnectSet``` and can contain
any collection of results from a number of queries

```NCBIConnectFASTA``` is a special interface that provides some nifty tools for
dealing with FASTA files


NCBIConnect
-----------

### Constructor

Instantiate using ```var myConn = new NCBIConnect('[database]')``` where
*[database]* is one of: *nucleotide*, *protein*.


### Methods

**query**

```javascript
query(
   str_searchTerm,
   obj_filters,
   fn_callback [ context NCBIConnect, params [ Error, NCBIConnectResult ] ]
)
```

Supported filters are ```limit``` to provide a max number of records to return,
and ```offset``` to indicate which record to begin at.

**queryFASTA**

```javascript
queryFASTA(
   str_id OR arr_idList,
   str_fileIdentifier,
   fn_callback [ context NCBIConnect, params [ Error, NCBIConnectFASTA ] ]
)
```

```id``` is a specific gene identifier (Gi) or an array of them, and
```fileIdentifer``` should be a unique string that can be used to identify the
file.

**createCollection**

```javascript
createCollection()
```

Creates an empty ```NCBIConnectCollection``` which can then be used to store
result sets for future use.


NCBIConnectRow
--------------

### Constructor

Inaccessible, created only as a result of a query from ```NCBIConnect```


### Methods

**set**

```javascript
set(
   str_field,
   var_value
)
```

Sets a given field of the row to a specific value.

**get**

```javascript
get(
   str_field,
   var_defaultValue
)
```

Gets the value of the row associated with a specific field. If no value is
present, defaultValue is returned.

**getFASTA**

```javascript
getFASTA(
   fn_callback [ context NCBIConnect, params [ Error, NCBIConnectFASTA ] ]
)
```

Alias for ```NCBIConnect.queryFASTA``` for this specific result row.


NCBIConnectSet
--------------

### Constructor

Inaccessible, created only as a result of selecting values from
```NCBIConnectResult``` or ```NCBIConnectCollection```


### Methods

**each**

```javascript
each(
   fn_callback [ context NCBIConnect, params [ NCBIConnectRow ] ]
)
```

Executes a provided callback function for each row in the set, starting with
the first result.

**count**

```javascript
count()
```

Returns the number of items in the set.

**item**

```javascript
item(
   int_index
)
```

Returns the item at ```index``` from the set (```NCBIConnectRow```).

**first**

```javascript
first()
```

Returns the first item of the set. Throws an error if the set
is empty.

**last**

```javascript
last()
```

Returns the last item of the set. Throws an error if the set is
empty.

**range**

```javascript
range(
   int_start,
   int_end
)
```

Returns ```NCBIConnectSet``` with values beginning at index ```start``` and
ending at index ```end``` (**inclusive**).

**subset**

```javascript
subset(
   int_start,
   int_length
)
```

Returns ```NCBIConnectSet``` with values beginning at index ```start``` that is
```length``` items long.

**toArray**

```javascript
toArray()
```

Converts the set into a native Array of native Objects. (These objects are *not*
copies! They contain referential row data.)

**list**

```javascript
list(
   str_field
)
```

Returns a native Array of all values associated with ```field``` for each
row in the set.

**getFASTA**

```javascript
getFASTA(
   fn_callback [ context NCBIConnect, params [ Error, NCBIConnectFASTA ] ]
)
```

Alias for ```NCBIConnect.queryFASTA``` for all rows in the set - returns
an aggregated (multi-FASTA) file.


NCBIConnectResult
-----------------

### Inherits

This Object inherits from ```NCBIConnectSet```


### Constructor

Inaccessible, returned as a result of ```NCBIConnect.query```


NCBIConnectCollection
----------------------

### Inherits

This Object inherits from ```NCBIConnectSet```


### Constructor

Inaccessible, returned as a result of ```NCBIConnect.createCollection```


### Methods

**add**

```javascript
add(
   [NCBIConnectRow
      or NCBIConnectSet
      or NCBIConnectResult
      or NCBIConnectCollection],
   ...
)
```

Accepts any number of arguments of the above specified kinds. Adds the rows from
these objects, in order, to the collection. Returns current collection.

**remove**

```javascript
remove(
   int_index
)
```

Removes the row at specified index from the current collection, and returns the
current collection.


NCBIConnectFASTA
----------------

### Constructor

Inaccessible, returned as a result of ```NCBIConnect.queryFASTA```'s callback.


### Methods

**size**

```javascript
size()
```

Returns the total size, in bytes, of the raw FASTA (or multiFASTA) file.

**raw**

```javascript
raw()
```

Returns a string containing the raw FASTA (or multiFASTA) file.

**data**

```javascript
data(
   opt_int_index
)
```

If ```index``` is supplied, provides a native Object containing both the header
(comments) and content data of the FASTA file at the specified index (useful
for multiFASTA files). Otherwise provides a native Array containing all such
Objects. (Single FASTA files will use an index of 0).

**header**

```javascript
header(
   opt_int_index
)
```

Similar to ```data()```, but provides the specific header (comment) information
for FASTA file at specified index.

**content**

```javascript
content(
   opt_int_index
)
```

Similar to ```header```, but provides the specific content information
for FASTA file at specified index. (No whitespace.)

**save**

```javascript
save(
   opt_str_name
)
```

Automatically saves the full FASTA or multiFASTA file to the user's
browser-specified "Downloads" folder. If ```name``` is provided, it will
attempt to save the file as ```name + '.seq'```, otherwise the name will be
automatically generated.


Thanks
======

Thanks for checking out NCBIConnect.js :)

You can check out my other projects on my GitHub account:
http://github.com/keithwhor

View my personal website at:
http://keithwhor.com

Or follow me on Twitter:
@keithwhor
http://twitter.com/keithwhor

Cheers!
