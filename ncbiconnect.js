!function() {

   var helpers = {
      zeropad: function(n) {
         n = n.toString();
         if(n.length < 2) { n = '0' + n; }
         return n;
      },
      formatDate: function(timeStr) {
         var date = new Date(timeStr);
         var dmy = [
            this.zeropad(date.getFullYear()),
            this.zeropad(date.getMonth() + 1),
            this.zeropad(date.getDate()),
         ].join('');
         return dmy;
      },
   };


   function NCBIConnect(db) {
      this.__URL = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
      if(!this.__dbMap.hasOwnProperty(db)) {
         throw new Error('Database "' + db + '" not supported');
      }
      this.__dbAlias = db;
      this.__db = this.__dbMap[db];
      this.__resultChunkSize = 100;
   }

   NCBIConnect.prototype.__dbMap = {
      'nucleotide': 'nuccore',
      'protein': 'protein',
      /*'gene': 'gene',*/
   };

   NCBIConnect.prototype.__processResult = {
      'nucleotide': function(row, el) {
         row.set('id', el.querySelector('Id').textContent);
         row.set('name', el.querySelector('Item[Name="Title"]').textContent);
         row.set('created_at', new Date(el.querySelector('Item[Name="CreateDate"]').textContent));
         row.set('updated_at', new Date(el.querySelector('Item[Name="UpdateDate"]').textContent));
         row.set('length', parseInt(el.querySelector('Item[Name="Length"]').textContent));
      },
      'protein': function(row, el) {
         row.set('id', el.querySelector('Id').textContent);
         row.set('name', el.querySelector('Item[Name="Title"]').textContent);
         row.set('created_at', new Date(el.querySelector('Item[Name="CreateDate"]').textContent));
         row.set('updated_at', new Date(el.querySelector('Item[Name="UpdateDate"]').textContent));
         row.set('length', parseInt(el.querySelector('Item[Name="Length"]').textContent));
      },
      /*'gene': function(row, el) {
         row.set('id', el.querySelector('Id').textContent);
         row.set('shortname', el.querySelector('Item[Name="Name"]').textContent);
         row.set('description', el.querySelector('Item[Name="Description"]').textContent);
         row.set('organism', el.querySelector('Item[Name="Orgname"]').textContent);
         row.set('name', row.get('organism') + ', ' + row.get('shortname') + ', ' + row.get('description'));
         row.set('accession', el.querySelector('Item[Name="ChrAccVer"]').textContent);
         row.set('start', el.querySelector('Item[Name="ChrStart"]').textContent);
         row.set('stop', el.querySelector('Item[Name="ChrStop"]').textContent);
         row.set('length', Math.abs(parseInt(row.get('stop')) - parseInt(row.get('start'))));
      },*/
   };

   NCBIConnect.prototype.__filterMap = {
      'limit': 'retmax',
      'offset': 'retstart',
   };

   NCBIConnect.prototype.__processFilters = function(filters) {

      var keys = Object.keys(this.__filterMap);
      var newFilters = [];

      for(var i = 0, len = keys.length; i < len; i++) {
         var key = keys[i];
         if(filters.hasOwnProperty(key)) {
            newFilters.push(this.__filterMap[key] + '=' + filters[key]);
         }
      }

      if(newFilters.length > 0) {
         return '&' + newFilters.join('&');
      } else {
         return '';
      }

   };

   NCBIConnect.prototype.query = function(term, filters, callback) {
      this.__esearch(term, filters, callback);
   };

   NCBIConnect.prototype.__esearch = function(term, filters, callback) {

      filters = this.__processFilters(filters);

      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = (function() {
         if(xhr.readyState === 4) {
            if(xhr.status === 200) {
               var data = JSON.parse(xhr.responseText);
               var searchResult = data.esearchresult;
               var idList = searchResult.idlist;
               this.__esummary(idList, callback);
            } else {
               callback.call(
                  this,
                  new Error('Could not obtain search results: Received code ' + xhr.status + ' from server'),
                  null
               );
            }
         }
      }).bind(this);

      xhr.open('POST', this.__URL + 'esearch.fcgi');
      xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
      xhr.send(
         'db=' +
         this.__db +
         '&term=' + term +
         '&sort=relevance&retmode=json' +
         filters
      );

   };

   NCBIConnect.prototype.__esummary = function(idList, callback) {

      idList = idList.slice(0);
      var curOffset = 0;

      var result = new NCBIConnectResult(this, idList.length, callback);
      var xhrList = [];

      while(idList.length) {
         var curList = idList.splice(0, this.__resultChunkSize);

         (function(xhrs, list, offset) {

            var xhr = new XMLHttpRequest();
            xhrs.push(xhr);

            xhr.onreadystatechange = (function() {
               if(xhr.readyState === 4) {
                  if(xhr.status === 200) {
                     var xml = xhr.responseXML;
                     var elements = xml.querySelectorAll('DocSum');
                     var len = elements.length;
                     var fnProcess = this.__processResult[this.__dbAlias];
                     for(var i = 0; i < len; i++) {
                        var row = new NCBIConnectRow(this);
                        fnProcess.call(this, row, elements[i])
                        result.__read(offset + i, row);
                     }
                  } else {
                     xhrs.map(function(xhr) {
                        xhr.onreadystatechange = null;
                        xhr.abort();
                     });
                     callback.call(
                        this,
                        Error('Could not obtain summary results: Received code ' + xhr.status + ' from server'),
                        null
                     );
                  }
               }
            }).bind(this);
            xhr.open('POST', this.__URL + 'esummary.fcgi');
            xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            xhr.send('db=' + this.__db + '&id=' + list.join(','));

         }).call(this, xhrList, curList, curOffset);

         curOffset += this.__resultChunkSize;
      }

   };

   NCBIConnect.prototype.queryFASTA = function(id, name, callback) {

      if(id instanceof Array) {
         if(id.length > 1) {
            name = 'AGGR' + id.length + '_' + name;
         }
         id = id.join(',');
      }

      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = (function() {
         if(xhr.readyState === 4) {
            var error = null;
            var fasta = null;
            if(xhr.status === 200) {
               fasta = new NCBIConnectFASTA(name, xhr.responseText);
            } else {
               error = new Error('Could not obtain FASTA file: Received code ' + xhr.status + ' from server');
            }
            callback.call(this, error, fasta);
         }
      }).bind(this);
      xhr.open('POST', this.__URL + 'efetch.fcgi');
      xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
      xhr.send('db=' + this.__db + '&id=' + id + '&rettype=fasta&retmode=text');

   };

   NCBIConnect.prototype.createCollection = function() {
      return new NCBIConnectCollection(this);
   };


   function NCBIConnectFASTA(name, raw) {
      this.__size = raw.length;
      this.__name = name
         .split(' ')
         .slice(0, 8)
         .join(' ')
         .replace(/[^\w]+/gi, '_')
         .toLowerCase()
         .substr(0, 128);

      var files = raw.split('>').slice(1);
      var len = files.length;
      var data = Array(len);

      for(var i = 0; i < len; i++) {
         var lines = files[i].split('\n');
         data[i] = Object.create(null);
         data[i]['header'] = lines[0];
         data[i]['content'] = lines.slice(1).join('');
      }

      this.__data = data;
      this.__raw = raw;
   };

   NCBIConnectFASTA.prototype.size = function() {
      return this.__size;
   };

   NCBIConnectFASTA.prototype.raw = function() {
      return this.__raw;
   };

   NCBIConnectFASTA.prototype.data= function(n) {
      if(n !== undefined) {
         return this.__data[n | 0];
      }
      return this.__data;
   };

   NCBIConnectFASTA.prototype.header = function(n) {
      return this.__data[n | 0]['header'];
   };

   NCBIConnectFASTA.prototype.content = function(n) {
      return this.__data[n | 0]['content'];
   };

   NCBIConnectFASTA.prototype.save = function(name) {
      var fileBlob = new Blob([this.__raw], {type: 'text/fasta'});
      var blobURL = window.URL.createObjectURL(fileBlob);
      var a = document.createElement('a');
      a.href = blobURL;
      a.download = helpers.formatDate((new Date).toString()) + '_' + (name || this.__name) + '.seq';
      a.click();
      window.URL.revokeObjectURL(blobURL);
   };


   function NCBIConnectSet(parent, data) {
      this.__parent = parent;
      this.__data = data;
      this.__length = data.length;
   };

   NCBIConnectSet.prototype.__checkEmpty = function() {
      if(!this.__length) { throw new Error('Result set empty'); }
   };

   NCBIConnectSet.prototype.each = function(fn) {
      if(typeof(fn)!=='function') {
         throw new Error('.each requires a callback function');
      }
      for(var i = 0, len = this.__length, data = this.__data; i < len; i++) {
         fn.call(this.__parent, data[i]);
      }
   };

   NCBIConnectSet.prototype.item = function(n) {
      var item = this.__data[n | 0];
      if(!item) { throw new Error('Item ' + n + ' out of range'); }
      return item;
   };

   NCBIConnectSet.prototype.count = function() {
      return this.__length;
   };

   NCBIConnectSet.prototype.first = function() {
      this.__checkEmpty();
      return this.__data[0];
   };

   NCBIConnectSet.prototype.last = function() {
      this.__checkEmpty();
      return this.__data[this.__length - 1];
   };

   NCBIConnectSet.prototype.range = function(start, end) {
      this.__checkEmpty();
      start |= 0;
      end |= 0;
      return new NCBIConnectSet(this.__parent, this.__data.slice(start, end + 1));
   };

   NCBIConnectSet.prototype.subset = function(start, length) {
      this.__checkEmpty();
      start |= 0;
      length |= 0;
      return new NCBIConnectSet(this.__parent, this.__data.slice(start, start + length));
   };

   NCBIConnectSet.prototype.toArray = function() {
      return this.__data.slice(0).map(function(v) { return v.__row; });
   };

   NCBIConnectSet.prototype.list = function(field) {
      return this.__data.map(function(v) { return v.get(field); });
   };

   NCBIConnectSet.prototype.getFASTA = function(callback) {
      this.__checkEmpty();
      this.__parent.queryFASTA(this.list('id'), this.first().get('name'), callback);
      return this;
   };


   function NCBIConnectCollection(parent) {
      NCBIConnectSet.call(this, parent, []);
   };

   NCBIConnectCollection.prototype = Object.create(NCBIConnectSet.prototype);

   NCBIConnectCollection.prototype.constructor = NCBIConnectSet;

   NCBIConnectCollection.prototype.add = function() {
      var values = [].slice.call(arguments);
      for(var i = 0, len = values.length; i < len; i++) {
         var item = values[i];
         if(item instanceof NCBIConnectSet) {
            this.__data = this.__data.concat(item.__data);
         } else if(item instanceof NCBIConnectRow) {
            this.__data.push(item);
         } else {
            throw new Error('Can only add NCBIConnectRow to an NCBIConnectCollection');
         }
      };
      return this;
   };

   NCBIConnectCollection.prototype.remove = function(n) {
      this.__data.splice(n, 1);
      return this;
   };


   function NCBIConnectResult(parent, length, callback) {
      this.__parent = parent;
      this.__data = Array(length);
      this.__length = length;
      this.__records = 0;
      this.__callback = callback;
      this.__cursor = 0;
      this.__ready = false;
      this.__refResult = this;
      if(this.__length === 0) {
         this.__initialized();
      }
   };

   NCBIConnectResult.prototype = Object.create(NCBIConnectSet.prototype);

   NCBIConnectResult.prototype.constructor = NCBIConnectResult;

   NCBIConnectResult.prototype.__read = function(offset, data) {
      data._id = offset;
      this.__data[offset] = data;
      if(++this.__records === this.__length) {
         this.__initialized();
      }
   };

   NCBIConnectResult.prototype.__initialized = function() {
      this.__ready = true;
      if(typeof(this.__callback) === 'function') {
         this.__callback.call(this.__parent, null, this);
      }
   };


   function NCBIConnectRow(parent) {
      this.__parent = parent;
      this.__row = Object.create(null);
   };

   NCBIConnectRow.prototype.set = function(field, value) {
      this.__row[field] = value;
   };

   NCBIConnectRow.prototype.get = function(field, defaultValue) {
      return this.__row[field]===undefined?defaultValue:this.__row[field];
   };

   NCBIConnectRow.prototype.getFASTA = function(callback) {
      this.__parent.queryFASTA(this.get('id'), this.get('name'), callback);
   };


   window['NCBIConnect'] = NCBIConnect;

}();
