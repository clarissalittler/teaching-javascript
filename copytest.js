
copy = require('./nodecopy.js');

copy("rand.txt","rand2.txt", function (err) {
    if (err) {
        throw err;
    }
    else {
        console.log("copied");
    }
});
