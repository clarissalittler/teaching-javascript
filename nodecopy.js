
fs = require('fs');
function copy(file1, file2, callback) {
    fs.readFile(file1, function (err, res) {
        //Now we're in the body of the callback that runs when readFile hsa finished
        if (err) {
            throw err;
        }
        else {
            // now we pass our top level callback into writeFile so that it executes
            // whenever writeFile finishes
            fs.writeFile(file2, res, callback);
        }
    });
}

module.exports = copy;
