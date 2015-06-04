
fs = require('fs');

module.exports = function (files, callback) {
    var targetSize = files.length; //for convenience, we store the size of the list of files in a variable
    var fileSizes = new Array(targetSize); //this is where we'll store our calculations about the sizes of all the files
    var counter = 0; //this variable is for keeping track of how many of the files are finished being read. Once all of them have been read, we can finish our callback 
    files.forEach(function (f,i) {
        fs.readFile(f, function (err,data) {
            if (err) {
                throw err;
            }
            else {
                fileSizes[i] = {file : f, size: data.length};
                counter = counter+1;
                if (counter == targetSize) { 
                    //if all our concurrent reads are done, figure out what the largest file is
                    //and pass that name into the callback
                    fileSizes.sort(function (a,b) { return ( a.size - b.size)});
                    callback(fileSizes[targetSize-1].file);
                }
            }
        });
    })
}
